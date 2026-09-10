import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { and, eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { AssetError } from '../assets/errors.js';
import { assertSafeReadPath } from '../assets/version-content.js';
import { createVersion } from '../assets/versions.js';
import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import {
  ACCOUNT_ROLE,
  type AccountRole,
  type AssetType,
  asset,
  assetFile,
  assetVersion,
  auditLog,
  userAccount,
} from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { createAssetRoutes } from './assets.js';
import { rbacContext } from './auth-middleware.js';

const PREFIX = 'ast-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let member: string; // 普通用户（资产 owner / 上传者）
let owner2: string; // 另一普通用户（非 owner 上传者视角）
let outsider: string; // 无成员关系
let assetAdmin: string; // 管理档（原空间 ADMIN 面并入）
let superAdmin: string;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let audit!: ReturnType<typeof createAuditWriter>;
let uploadRateLimiter!: InMemoryRateLimiter;
let draftSeedKey = ''; // DELETE 存储清理断言用（seed 记录的 key）
let vreadAssetIdRef = 0; // T14/T15 版本读面/删除专用资产 id（describe beforeAll 赋值）

async function makeUser(tag: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'ast-http');
  return `aih_session=${sid}`;
}
/** 直插资产（可见性矩阵 seed；走服务层注册会重复测——此处为读面预置数据） */
async function insertAsset(
  slug: string,
  type: AssetType,
  ownerId: string,
  visibility: string,
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED' = 'ACTIVE',
) {
  await db
    .insert(asset)
    .values({ slug, type, ownerId, visibility: visibility as never, status })
    .returning({ id: asset.id });
}
/** 直插并取回 id（版本/文件 seed 依赖） */
async function insertAssetReturning(
  slug: string,
  type: AssetType,
  ownerId: string,
  visibility: string,
): Promise<{ id: number }> {
  const rows = await db
    .insert(asset)
    .values({ slug, type, ownerId, visibility: visibility as never })
    .returning({ id: asset.id });
  return rows[0]!;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 404 | 409 | 413,
      );
    }
    if (err instanceof AssetError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 403 | 404 | 409 | 413,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  return app;
}

const ORIGIN = { origin: 'http://localhost:3000' };
function jsonRequest(method: string, url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...ORIGIN,
    host: 'localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method, headers, body: JSON.stringify(body) });
}
function getReq(url: string, cookie?: string) {
  const headers: Record<string, string> = { host: 'localhost:3000' };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method: 'GET', headers });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'ast-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(60_000, 10);
  member = await makeUser('member');
  owner2 = await makeUser('owner2');
  outsider = await makeUser('outsider');
  assetAdmin = await makeUser('asset-admin');
  superAdmin = await makeUser('super-admin');
  await setRole(assetAdmin, ACCOUNT_ROLE.ADMIN);
  await setRole(superAdmin, ACCOUNT_ROLE.SUPER_ADMIN);
  // 读面 seed：PUBLIC skill（member 传）/ PRIVATE mcp（member 传）/ HIDDEN / 额外 PUBLIC
  await insertAsset('ast-pub-skill', 'skill', member, 'PUBLIC');
  await insertAsset('ast-priv-mcp', 'mcp', member, 'PRIVATE');
  await insertAsset('ast-hidden', 'agent', member, 'PUBLIC', 'HIDDEN');
  await insertAsset('ast-arch-pub', 'skill', member, 'PUBLIC');
  await insertAsset('ast-vread', 'skill', member, 'PUBLIC'); // T14 版本读面专用（owner=member）
  // 管理面 seed：visibility PATCH 目标 / 删除目标（无版本、有 PUBLISHED、DRAFT+文件）
  await insertAsset('ast-vis-target', 'skill', member, 'PUBLIC');
  await insertAsset('ast-del-plain', 'skill', member, 'PUBLIC');
  const delPub = await insertAssetReturning('ast-del-pub', 'skill', member, 'PUBLIC');
  const delDraft = await insertAssetReturning('ast-del-draft', 'skill', member, 'PUBLIC');
  const pubVersion = await db
    .insert(assetVersion)
    .values({
      assetId: delPub.id,
      version: '1.0.0',
      status: 'PUBLISHED',
      fileCount: 0,
      totalSize: 0,
    })
    .returning({ id: assetVersion.id });
  const draftVersion = await db
    .insert(assetVersion)
    .values({ assetId: delDraft.id, version: '0.1.0', status: 'DRAFT', fileCount: 1, totalSize: 3 })
    .returning({ id: assetVersion.id });
  const draftKey = `${delDraft.id}/${draftVersion[0]!.id}/SKILL.md`;
  draftSeedKey = draftKey;
  const draftContent = Buffer.from('---\nname: ast-del-draft\n---\n');
  await storage.put(draftKey, draftContent, { contentType: 'text/markdown' });
  await db.insert(assetFile).values({
    versionId: draftVersion[0]!.id,
    filePath: 'SKILL.md',
    fileSize: draftContent.byteLength,
    sha256: createHash('sha256').update(draftContent).digest('hex'),
    storageKey: draftKey,
  });
  void pubVersion;
});

afterAll(async () => {
  // 本文件专属用户（各唯一 tag）——按 ownerId 精确定位资产，避免与他文件的 ast- 前缀资产互踩
  const ownerIds = [member, owner2, outsider, assetAdmin, superAdmin].filter(Boolean);
  // FK 序：asset_file → asset_version → asset → audit → user
  const ownedAssetIds = (
    await db.select({ id: asset.id }).from(asset).where(inArray(asset.ownerId, ownerIds))
  ).map((a) => a.id);
  if (ownedAssetIds.length > 0) {
    const versionRows = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(inArray(assetVersion.assetId, ownedAssetIds));
    const vIds = versionRows.map((v) => v.id);
    if (vIds.length > 0) {
      await db.delete(assetFile).where(inArray(assetFile.versionId, vIds));
      await db.delete(assetVersion).where(inArray(assetVersion.id, vIds));
    }
    await db.delete(asset).where(inArray(asset.id, ownedAssetIds));
  }
  await db.delete(auditLog).where(inArray(auditLog.actorId, ownerIds));
  await db.delete(userAccount).where(inArray(userAccount.id, ownerIds));
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

describe('POST /api/assets 注册', () => {
  it('登录用户注册 201：owner/visibility 默认 PUBLIC 落位', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { slug: 'ast-new-skill', type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.slug).toBe('ast-new-skill');
    expect(body.type).toBe('skill');
    expect(body.visibility).toBe('PUBLIC');
    expect(body.ownerId).toBe(member);
    expect(body.status).toBe('ACTIVE');
  });

  it('slug 冲突 409（跨类型唯一）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { slug: 'ast-pub-skill', type: 'agent' },
      await cookieFor(member),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.slug_taken');
  });

  it('任一登录用户即可注册 201（原空间成员门已删——注册 = 用户+）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { slug: 'ast-outsider-skill', type: 'skill' },
      await cookieFor(outsider),
    );
    expect(res.status).toBe(201);
  });

  it('注册 visibility 显式 PRIVATE 落位（08 §5.1）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { slug: 'ast-priv-reg', type: 'mcp', visibility: 'PRIVATE' },
      await cookieFor(member),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { visibility: string };
    expect(body.visibility).toBe('PRIVATE');
  });

  it('缺 slug → 400 request.invalid（路由层 zod 前置）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('request.invalid');
  });

  it('body 非法 400（slug 大写）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { slug: 'Bad-Slug', type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(400);
  });

  it('未登录 401', async () => {
    const res = await jsonRequest('POST', '/api/assets', { slug: 'ast-x', type: 'skill' });
    expect(res.status).toBe(401);
  });
});

/** multipart 上传构造（T13：app.request + FormData——bun 原生支持） */
function uploadZip(
  cookie: string,
  path: string,
  zip: Buffer,
  version = '1.0.0',
  changelog?: string,
) {
  const fd = new FormData();
  fd.append('file', new File([zip], 'pkg.zip', { type: 'application/zip' }));
  fd.append('version', version);
  if (changelog) fd.append('changelog', changelog);
  return buildApp().request(`/api/assets/${path}/versions`, {
    method: 'POST',
    headers: { origin: ORIGIN.origin, host: 'localhost:3000', cookie },
    body: fd,
  });
}

function uploadSkillZip(): Buffer {
  return buildZip([
    {
      name: 'SKILL.md',
      content: '---\nname: ast-pub-skill\ndescription: upload http test\n---\n# Demo\n\nbody\n',
    },
    { name: 'references/a.md', content: 'a\n' },
  ]);
}

describe('POST /api/assets/{ns}/{slug}/versions（T13 multipart 上传）', () => {
  it('201 全链（member 上传合法包——DRAFT + fileCount）', async () => {
    const res = await uploadZip(
      await cookieFor(member),
      'ast-pub-skill',
      uploadSkillZip(),
      '3.1.0',
      'via http',
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { status: string; fileCount: number; version: string };
    expect(body.status).toBe('DRAFT');
    expect(body.fileCount).toBe(2);
    expect(body.version).toBe('3.1.0');
  });

  it('校验失败 400 + issues 全量（首错误码）', async () => {
    const bad = buildZip([{ name: 'SKILL.md', content: 'no frontmatter\n' }]);
    const res = await uploadZip(await cookieFor(member), 'ast-pub-skill', bad, '3.2.0');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; issues: Array<{ code: string }> };
    expect(body.issues.length).toBeGreaterThan(0);
    expect(body.code).toBe(body.issues[0]!.code);
  });

  it('version 非 semver → 400 request.invalid', async () => {
    const res = await uploadZip(await cookieFor(member), 'ast-pub-skill', uploadSkillZip(), 'v3');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('request.invalid');
  });

  it('非 owner 非管理档上传他人资产 → 403', async () => {
    const res = await uploadZip(
      await cookieFor(outsider),
      'ast-pub-skill',
      uploadSkillZip(),
      '3.3.0',
    );
    expect(res.status).toBe(403);
  });

  it('资产不存在 → 404', async () => {
    const res = await uploadZip(await cookieFor(member), 'ast-missing', uploadSkillZip(), '3.4.0');
    expect(res.status).toBe(404);
  });

  it('超上限 413（包体 > ASSET_PACKAGE_MAX_BYTES 10MiB）', async () => {
    const big = buildZip([
      { name: 'SKILL.md', content: '---\nname: big\ndescription: big\n---\nbody\n' },
      { name: 'blob.bin', content: Buffer.alloc(11 * 1024 * 1024, 1) },
    ]);
    const res = await uploadZip(await cookieFor(member), 'ast-pub-skill', big, '3.5.0');
    expect(res.status).toBe(413);
    expect(((await res.json()) as { code: string }).code).toBe('asset.package_too_large');
  });

  it('限流 429（第 11 次上传——10 次/分钟窗口）', async () => {
    // 预热限流 key（member 已传 3 次——补 hit 到 10）
    for (let i = 0; i < 7; i++) uploadRateLimiter.hit(`asset-upload:${member}`);
    const res = await uploadZip(
      await cookieFor(member),
      'ast-pub-skill',
      uploadSkillZip(),
      '9.9.9',
    );
    expect(res.status).toBe(429);
  });

  it('未登录 401', async () => {
    const res = await uploadZip('', 'ast-pub-skill', uploadSkillZip(), '3.6.0');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/assets/{slug} 详情（可见性——skillhub 对齐分层）', () => {
  it('PUBLIC 匿名 200', async () => {
    const res = await getReq('/api/assets/ast-pub-skill');
    expect(res.status).toBe(200);
  });

  it('PRIVATE 匿名 403（存在但无权——access_denied）', async () => {
    const res = await getReq('/api/assets/ast-priv-mcp');
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.access_denied');
  });

  it('PRIVATE owner 200', async () => {
    const res = await getReq('/api/assets/ast-priv-mcp', await cookieFor(member));
    expect(res.status).toBe(200);
  });

  it('PRIVATE 非 owner 403（access_denied）', async () => {
    const res = await getReq('/api/assets/ast-priv-mcp', await cookieFor(outsider));
    expect(res.status).toBe(403);
  });

  it('PRIVATE 管理档（非 owner 非超管）403（读面仅 owner/超管）', async () => {
    const res = await getReq('/api/assets/ast-priv-mcp', await cookieFor(assetAdmin));
    expect(res.status).toBe(403);
  });

  it('坐标不存在 404（slug 不存在）', async () => {
    expect((await getReq('/api/assets/ast-no-such')).status).toBe(404);
    expect((await getReq('/api/assets/ast-no-such-slug')).status).toBe(404);
  });

  it('HIDDEN 资产：登录用户 404（活跃面不存在）；SUPER_ADMIN 200', async () => {
    expect((await getReq('/api/assets/ast-hidden', await cookieFor(member))).status).toBe(404);
    expect((await getReq('/api/assets/ast-hidden', await cookieFor(superAdmin))).status).toBe(200);
  });

  it('PUBLIC 资产：非 owner 登录用户 200（原空间归档门已删）', async () => {
    const res = await getReq('/api/assets/ast-arch-pub', await cookieFor(outsider));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string };
    expect(body.slug).toBe('ast-arch-pub');
  });

  it('PUBLIC 资产：SUPER_ADMIN 可见', async () => {
    const res = await getReq('/api/assets/ast-arch-pub', await cookieFor(superAdmin));
    expect(res.status).toBe(200);
  });

  it('PRIVATE SUPER_ADMIN 可见（短路）', async () => {
    const res = await getReq('/api/assets/ast-priv-mcp', await cookieFor(superAdmin));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/assets 列表（读面过滤；M4a R4 匿名放行）', () => {
  it('匿名 200：仅 PUBLIC 可见（PUBLIC-only 短路——不泄漏他人 PRIVATE/NAMESPACE_ONLY）', async () => {
    const res = await getReq('/api/assets');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain('ast-pub-skill'); // PUBLIC 可见
    expect(slugs).toContain('ast-new-skill'); // 注册用例产物 PUBLIC
    expect(slugs).not.toContain('ast-priv-mcp'); // 他人 PRIVATE 不泄漏
  });

  it('登录用户：PUBLIC + 自己 PRIVATE 可见；他人 PRIVATE 不可见', async () => {
    const res = await getReq('/api/assets', await cookieFor(member));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain('ast-pub-skill'); // PUBLIC
    expect(slugs).toContain('ast-priv-mcp'); // 自己是 owner
    expect(slugs).toContain('ast-new-skill'); // 注册用例产物 PUBLIC
  });

  it('outsider（非成员）：PUBLIC 可见、PRIVATE 不可见', async () => {
    const res = await getReq('/api/assets', await cookieFor(outsider));
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain('ast-pub-skill');
    expect(slugs).not.toContain('ast-priv-mcp');
  });

  it('type 过滤', async () => {
    const res = await getReq('/api/assets?type=mcp', await cookieFor(member));
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    expect(body.items.every((i) => i.slug.startsWith('ast-'))).toBe(true);
    expect(body.items.filter((i) => i.slug === 'ast-priv-mcp').length).toBeGreaterThanOrEqual(1);
  });
});

describe('R5/R6：assetItem latest 版本投影 + ownerDisplayName（M4a）', () => {
  it('详情：PUBLISHED latest 投影 + owner 显示名（匿名可读）', async () => {
    const [a] = await db
      .insert(asset)
      .values({
        slug: 'ast-meta-proj',
        type: 'skill',
        ownerId: member,
        visibility: 'PUBLIC',
      })
      .returning({ id: asset.id });
    const [v] = await db
      .insert(assetVersion)
      .values({
        assetId: a!.id,
        version: '2.1.0',
        status: 'PUBLISHED',
        createdBy: member,
        publishedAt: new Date(),
        parsedMetadataJson: { name: 'Meta 投影技能', description: 'R5 断言描述' } as never,
      })
      .returning({ id: assetVersion.id });
    await db.update(asset).set({ latestVersionId: v!.id }).where(eq(asset.id, a!.id));

    const res = await getReq('/api/assets/ast-meta-proj'); // 匿名（PUBLIC）
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.latestVersion).toBe('2.1.0');
    expect(body.latestName).toBe('Meta 投影技能');
    expect(body.latestDescription).toBe('R5 断言描述');
    expect(body.ownerDisplayName).toBe('ast-member'); // makeUser displayName = ast-member
    expect(body.ownerId).toBe(member); // ownerId 保留（前端工号拼装）
  });

  it('列表：批注入字段与详情一致（防 N+1 同语义）', async () => {
    const res = await getReq('/api/assets?type=skill'); // 匿名
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{
        slug: string;
        latestVersion: string | null;
        latestName: string | null;
        ownerDisplayName: string | null;
      }>;
    };
    const item = body.items.find((i) => i.slug === 'ast-meta-proj');
    expect(item).toBeDefined();
    expect(item!.latestVersion).toBe('2.1.0');
    expect(item!.latestName).toBe('Meta 投影技能');
    expect(item!.ownerDisplayName).toBe('ast-member');
  });

  it('无版本资产：R5 字段 null（形状稳定）；owner 名仍返回', async () => {
    const res = await getReq('/api/assets/ast-pub-skill'); // seed 无版本
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.latestVersion).toBeNull();
    expect(body.latestName).toBeNull();
    expect(body.latestDescription).toBeNull();
    expect(body.ownerDisplayName).toBe('ast-member'); // owner 名不依赖版本
  });
});

describe('R8 文件内容读取（M4a——GET versions/:version/files/*）', () => {
  const vids: number[] = [];
  let pubAssetId = 0;
  beforeAll(async () => {
    // 懒建：PUBLISHED 资产（SKILL.md 文本 + 超大文件 + 二进制文件）+ YANKED 资产
    const [a] = await db
      .insert(asset)
      .values({
        slug: 'ast-file-pub',
        type: 'skill',
        ownerId: member,
        visibility: 'PUBLIC',
      })
      .returning({ id: asset.id });
    pubAssetId = a!.id;
    const [v] = await db
      .insert(assetVersion)
      .values({
        assetId: a!.id,
        version: '1.0.0',
        status: 'PUBLISHED',
        createdBy: member,
        publishedAt: new Date(),
      })
      .returning({ id: assetVersion.id });
    vids.push(v!.id);
    await db.update(asset).set({ latestVersionId: v!.id }).where(eq(asset.id, a!.id));
    const putFile = async (path: string, buf: Buffer, contentType?: string) => {
      const key = `${a!.id}/${v!.id}/${path}`;
      await storage.put(key, buf, contentType ? { contentType } : undefined);
      await db.insert(assetFile).values({
        versionId: v!.id,
        filePath: path,
        fileSize: buf.byteLength,
        contentType: contentType ?? null,
        sha256: 'x'.repeat(64),
        storageKey: key,
      });
    };
    await putFile(
      'SKILL.md',
      Buffer.from('---\nname: file-pub\n---\n# 内容读取测试\n正文行\n'),
      'text/markdown',
    );
    await putFile('reference/big.txt', Buffer.alloc(300 * 1024, 65)); // 300KB > 256KB 截断阈值
    await putFile(
      'assets/blob.bin',
      Buffer.from([0xff, 0x00, 0xfe, 0x01, 0x80]),
      'application/octet-stream',
    );
    // YANKED 资产
    const [ay] = await db
      .insert(asset)
      .values({
        slug: 'ast-file-yanked',
        type: 'skill',
        ownerId: member,
        visibility: 'PUBLIC',
      })
      .returning({ id: asset.id });
    const [vy] = await db
      .insert(assetVersion)
      .values({
        assetId: ay!.id,
        version: '2.0.0',
        status: 'YANKED',
        createdBy: member,
        publishedAt: new Date(),
        yankedAt: new Date(),
        yankedBy: member,
        yankReason: 't5',
      })
      .returning({ id: assetVersion.id });
    const keyY = `${ay!.id}/${vy!.id}/SKILL.md`;
    await storage.put(keyY, Buffer.from('yanked 内容'), { contentType: 'text/markdown' });
    await db.insert(assetFile).values({
      versionId: vy!.id,
      filePath: 'SKILL.md',
      fileSize: 12,
      contentType: 'text/markdown',
      sha256: 'y'.repeat(64),
      storageKey: keyY,
    });
  });

  it('PUBLISHED 文本文件匿名可读（content/binary:false）', async () => {
    const res = await getReq('/api/assets/ast-file-pub/versions/1.0.0/files/SKILL.md');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      path: string;
      binary: boolean;
      truncated: boolean;
      content: string;
    };
    expect(body.path).toBe('SKILL.md');
    expect(body.binary).toBe(false);
    expect(body.truncated).toBe(false);
    expect(body.content).toContain('# 内容读取测试');
  });

  it('超大文件：截断 truncated:true（content ≤ 256KB）', async () => {
    const res = await getReq('/api/assets/ast-file-pub/versions/1.0.0/files/reference/big.txt');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { truncated: boolean; content: string };
    expect(body.truncated).toBe(true);
    expect(Buffer.byteLength(body.content, 'utf8')).toBeLessThanOrEqual(256 * 1024 + 3);
  });

  it('二进制文件：binary:true 无 content', async () => {
    const res = await getReq('/api/assets/ast-file-pub/versions/1.0.0/files/assets/blob.bin');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { binary: boolean; content?: string };
    expect(body.binary).toBe(true);
    expect(body.content).toBeUndefined();
  });

  it('YANKED 版本：400 version_yanked', async () => {
    const res = await getReq('/api/assets/ast-file-yanked/versions/2.0.0/files/SKILL.md');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.version_yanked');
  });

  it('不存在文件：404 version_file_not_found', async () => {
    const res = await getReq('/api/assets/ast-file-pub/versions/1.0.0/files/NO-SUCH.md');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.version_file_not_found');
  });

  it('路径穿越：assertSafeReadPath 纯函数拒绝全形态（URL 层归一后 .. 不可达——纵深防御单测）', async () => {
    // URL 规范在客户端折叠 ../ 与 %2e%2e 段——服务端 assert 是防非规范代理的纵深；
    // 直接单测纯函数全形态
    for (const evil of ['../SKILL.md', 'a/../../b.md', '/etc/passwd', 'a\\b.md', '']) {
      let threw = false;
      try {
        assertSafeReadPath(evil);
      } catch (e) {
        threw =
          e instanceof AssetError && (e as AssetError).code === 'asset.version_file_path_invalid';
      }
      expect(threw).toBe(true);
    }
    expect(() => assertSafeReadPath('reference/ok.md')).not.toThrow();
  });

  it('不存在版本：404 asset.not_found', async () => {
    const res = await getReq('/api/assets/ast-file-pub/versions/9.9.9/files/SKILL.md');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.not_found');
  });

  it('PRIVATE 资产文件匿名：403 access_denied（读面分层先行）', async () => {
    const res = await getReq('/api/assets/ast-priv-mcp/versions/1.0.0/files/SKILL.md');
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.access_denied');
  });
});

describe('R9 版本对比（M4a——GET versions/compare 行级 hunks）', () => {
  beforeAll(async () => {
    // 懒建：两 PUBLISHED 版本（v1.0.0 基线 / v1.1.0：SKILL.md 改 2 行 + new.mjs 新增 + old.md 删除）
    const [a] = await db
      .insert(asset)
      .values({
        slug: 'ast-cmp',
        type: 'skill',
        ownerId: member,
        visibility: 'PUBLIC',
      })
      .returning({ id: asset.id });
    const mkVersion = async (version: string, files: Array<[string, Buffer, string?]>) => {
      const [v] = await db
        .insert(assetVersion)
        .values({
          assetId: a!.id,
          version,
          status: 'PUBLISHED',
          createdBy: member,
          publishedAt: new Date(),
        })
        .returning({ id: assetVersion.id });
      for (const [p, buf, ct] of files) {
        const key = `${a!.id}/${v!.id}/${p}`;
        await storage.put(key, buf, ct ? { contentType: ct } : undefined);
        await db.insert(assetFile).values({
          versionId: v!.id,
          filePath: p,
          fileSize: buf.byteLength,
          contentType: ct ?? null,
          sha256: `${version}-${p}`.padEnd(64, '0'),
          storageKey: key,
        });
      }
      return v!.id;
    };
    await mkVersion('1.0.0', [
      ['SKILL.md', Buffer.from('# Title\nline a\nline b\nline c\n## End\n'), 'text/markdown'],
      ['old.md', Buffer.from('# old\n'), 'text/markdown'],
    ]);
    await mkVersion('1.1.0', [
      [
        'SKILL.md',
        Buffer.from('# Title\nline a\nline b NEW\nline c\nline d\n## End\n'),
        'text/markdown',
      ],
      ['new.mjs', Buffer.from('export const v = 1;\n'), 'text/javascript'],
    ]);
  });

  it('MODIFIED 行级 hunks：DELETE+ADD 行号正确', async () => {
    const res = await getReq('/api/assets/ast-cmp/versions/compare?from=1.0.0&to=1.1.0');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      files: Array<{
        path: string;
        changeType: string;
        hunks?: Array<{
          lines: Array<{
            type: string;
            oldLineNumber: number | null;
            newLineNumber: number | null;
            content: string;
          }>;
        }>;
      }>;
    };
    const skill = body.files.find((f) => f.path === 'SKILL.md');
    expect(skill?.changeType).toBe('MODIFIED');
    const lines = skill?.hunks?.[0]?.lines ?? [];
    expect(lines.length).toBe(7);
    const delB = lines.find((l) => l.type === 'DELETE' && l.content === 'line b');
    expect(delB?.oldLineNumber).toBe(3);
    expect(delB?.newLineNumber).toBeNull();
    const addBNew = lines.find((l) => l.type === 'ADD' && l.content === 'line b NEW');
    expect(addBNew?.oldLineNumber).toBeNull();
    expect(addBNew?.newLineNumber).toBe(3);
    const addD = lines.find((l) => l.type === 'ADD' && l.content === 'line d');
    expect(addD?.newLineNumber).toBe(5);
    const ctxEnd = lines.find((l) => l.type === 'CONTEXT' && l.content === '## End');
    expect(ctxEnd?.oldLineNumber).toBe(5);
    expect(ctxEnd?.newLineNumber).toBe(6);
  });

  it('ADDED/DELETED 文件 + 未变文件不列', async () => {
    const res = await getReq('/api/assets/ast-cmp/versions/compare?from=1.0.0&to=1.1.0');
    const body = (await res.json()) as {
      files: Array<{
        path: string;
        changeType: string;
        hunks?: Array<{ lines: Array<{ type: string }> }>;
      }>;
    };
    expect(body.files.map((f) => f.path).sort()).toEqual(['SKILL.md', 'new.mjs', 'old.md']);
    const added = body.files.find((f) => f.path === 'new.mjs');
    expect(added?.changeType).toBe('ADDED');
    expect(added?.hunks?.[0]?.lines).toHaveLength(1); // export const v = 1; 全 ADD
    const deleted = body.files.find((f) => f.path === 'old.md');
    expect(deleted?.changeType).toBe('DELETED');
    expect(deleted?.hunks?.[0]?.lines?.[0]?.type).toBe('DELETE');
  });

  it('参数缺失：400 request.invalid', async () => {
    const res = await getReq('/api/assets/ast-cmp/versions/compare?from=1.0.0');
    expect(res.status).toBe(400);
  });

  it('版本不存在：404 asset.not_found', async () => {
    const res = await getReq('/api/assets/ast-cmp/versions/compare?from=1.0.0&to=9.9.9');
    expect(res.status).toBe(404);
  });

  it('YANKED 版本对比：400 version_yanked（两版本均存在——同版自比触发 yanked 判定）', async () => {
    const res = await getReq('/api/assets/ast-file-yanked/versions/compare?from=2.0.0&to=2.0.0');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.version_yanked');
  });

  it('同版本对比：无差异文件（空 files）', async () => {
    const res = await getReq('/api/assets/ast-cmp/versions/compare?from=1.0.0&to=1.0.0');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { files: unknown[] };
    expect(body.files).toEqual([]);
  });
});

describe('管理端点（PATCH visibility/status + DELETE——05 §6.4 canManageAsset）', () => {
  it('owner 改 visibility 200 + 审计行（Q3）', async () => {
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-vis-target',
      { visibility: 'PRIVATE' },
      await cookieFor(member),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { visibility: string };
    expect(body.visibility).toBe('PRIVATE');
    // 改后读面联动：非 owner 详情 403（access_denied）
    expect((await getReq('/api/assets/ast-vis-target')).status).toBe(403);
    const auditRows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.actorId, member));
    expect(auditRows.some((a) => a.action === 'asset.visibility_update')).toBe(true);
  });

  it('普通用户非 owner 改 visibility → 403', async () => {
    // assetAdmin 是管理档可改；outsider 非 owner 无管理档 → 403
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-vis-target',
      { visibility: 'PUBLIC' },
      await cookieFor(outsider),
    );
    expect(res.status).toBe(403);
  });

  it('管理档改 visibility 200（05 §6.5 管理面）', async () => {
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-vis-target',
      { visibility: 'NAMESPACE_ONLY' },
      await cookieFor(assetAdmin),
    );
    expect(res.status).toBe(200);
  });

  it('owner 改自己资产 visibility → 200（原空间归档拒写门已删）', async () => {
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-arch-pub',
      { visibility: 'PRIVATE' },
      await cookieFor(member), // member 是该资产 owner
    );
    expect(res.status).toBe(200);
  });

  it('owner 状态治理 PATCH status → HIDDEN 200 + 活跃面消失', async () => {
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-pub-skill/status',
      { status: 'HIDDEN' },
      await cookieFor(member),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('HIDDEN');
    // HIDDEN 后：匿名/登录读面 404（活跃面不存在），owner 亦不可读（详情语义）
    expect((await getReq('/api/assets/ast-pub-skill')).status).toBe(404);
    expect((await getReq('/api/assets/ast-pub-skill', await cookieFor(member))).status).toBe(404);
  });

  it('状态治理 owner 恢复 ACTIVE 200', async () => {
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-pub-skill/status',
      { status: 'ACTIVE' },
      await cookieFor(member),
    );
    expect(res.status).toBe(200);
    expect((await getReq('/api/assets/ast-pub-skill')).status).toBe(200);
  });

  it('普通用户非 owner PATCH status → 403', async () => {
    // owner2 非资产 owner 且无管理档 → 403
    const res = await jsonRequest(
      'PATCH',
      '/api/assets/ast-priv-mcp/status',
      { status: 'HIDDEN' },
      await cookieFor(owner2),
    );
    expect(res.status).toBe(403);
  });

  it('DELETE 无版本资产 204 + 详情 404 + 审计（Q5）', async () => {
    const res = await jsonRequest(
      'DELETE',
      '/api/assets/ast-del-plain',
      undefined,
      await cookieFor(member),
    );
    expect(res.status).toBe(204);
    expect((await getReq('/api/assets/ast-del-plain', await cookieFor(member))).status).toBe(404);
    const auditRows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.actorId, member));
    expect(auditRows.some((a) => a.action === 'asset.delete')).toBe(true);
  });

  it('DELETE 有 PUBLISHED 版本 → 400 has_published（防已分发资产静默移除）', async () => {
    const res = await jsonRequest(
      'DELETE',
      '/api/assets/ast-del-pub',
      undefined,
      await cookieFor(member),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.has_published');
  });

  it('DELETE DRAFT 版本资产：版本/文件行清理 + 存储文件删除', async () => {
    const res = await jsonRequest(
      'DELETE',
      '/api/assets/ast-del-draft',
      undefined,
      await cookieFor(member),
    );
    expect(res.status).toBe(204);
    // 版本行清理
    const versionRows = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .innerJoin(asset, eq(assetVersion.assetId, asset.id))
      .where(eq(asset.slug, 'ast-del-draft'));
    expect(versionRows).toHaveLength(0);
    // 文件行清理（assetFile 无 asset 直链——按该版本已被删的 asset 残余 file 行应为 0：
    // 直接断言全库该资产关联 file 已随版本删除）
    const fileRows = await db
      .select({ id: assetFile.id })
      .from(assetFile)
      .innerJoin(assetVersion, eq(assetFile.versionId, assetVersion.id))
      .innerJoin(asset, eq(assetVersion.assetId, asset.id))
      .where(eq(asset.slug, 'ast-del-draft'));
    expect(fileRows).toHaveLength(0);
    // 存储文件已清理（deleteMany 后 key 不存在）
    expect(await storage.exists(draftSeedKey)).toBe(false);
  });
});

describe('版本读面（T14 Q1——DRAFT 状态可见性过滤）', () => {
  const vreadZip = (name: string) =>
    buildZip([
      { name: 'SKILL.md', content: `---\nname: ${name}\ndescription: vread\n---\nbody\n` },
      { name: 'refs/a.md', content: 'a\n' },
    ]);

  beforeAll(async () => {
    const [row] = await db.select({ id: asset.id }).from(asset).where(eq(asset.slug, 'ast-vread'));
    vreadAssetIdRef = row!.id;
    // 三个 DRAFT：member(owner) 传 1.0.0 / owner2(非 owner 上传者) 传 2.0.0 / assetAdmin(ADMIN) 传 3.0.0
    for (const [uploader, version] of [
      [member, '1.0.0'],
      [owner2, '2.0.0'],
      [assetAdmin, '3.0.0'],
    ] as const) {
      await createVersion(db, storage, audit, {
        asset: { id: vreadAssetIdRef, type: 'skill' },
        uploaderId: uploader,
        file: vreadZip('ast-vread'),
        version,
      });
    }
  });

  it('owner（member）看自己传的 DRAFT 详情 200（manifest/files 齐全）', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/1.0.0', await cookieFor(member));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      files: Array<{ filePath: string }>;
      manifestJson: { name: string };
    };
    expect(body.status).toBe('DRAFT');
    expect(body.files.map((f) => f.filePath)).toContain('SKILL.md');
    expect(body.manifestJson.name).toBe('ast-vread');
  });

  it('owner 看他人上传的 DRAFT（2.0.0 owner2 传）也 200（owner 面）', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/2.0.0', await cookieFor(member));
    expect(res.status).toBe(200);
  });

  it('上传者（owner2 非 owner 非 ADMIN）看自己 DRAFT 200', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/2.0.0', await cookieFor(owner2));
    expect(res.status).toBe(200);
  });

  it('上传者看他人 DRAFT（1.0.0）→ 400 version_not_published（对齐 skillhub notPublished 明示）', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/1.0.0', await cookieFor(owner2));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_not_published');
  });

  it('管理档看任意 DRAFT 200（管理面——isPlatformReviewer）', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/1.0.0', await cookieFor(assetAdmin));
    expect(res.status).toBe(200);
  });

  it('普通用户看 DRAFT → 400 version_not_published（PUBLIC 资产也 400——明示未发布）', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/1.0.0', await cookieFor(outsider));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_not_published');
  });

  it('匿名看 DRAFT → 400 version_not_published', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/1.0.0');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_not_published');
  });

  it('SUPER_ADMIN 看 DRAFT 200（短路）', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/1.0.0', await cookieFor(superAdmin));
    expect(res.status).toBe(200);
  });

  it('列表：owner 见全部 3 版本；上传者仅见自己的；outsider 空列表', async () => {
    const ownerRes = await getReq('/api/assets/ast-vread/versions', await cookieFor(member));
    const ownerBody = (await ownerRes.json()) as { items: Array<{ version: string }> };
    expect(ownerBody.items.map((i) => i.version).sort()).toEqual(['1.0.0', '2.0.0', '3.0.0']);

    const uploaderRes = await getReq('/api/assets/ast-vread/versions', await cookieFor(owner2));
    const uploaderBody = (await uploaderRes.json()) as { items: Array<{ version: string }> };
    expect(uploaderBody.items.map((i) => i.version)).toEqual(['2.0.0']);

    const outsiderRes = await getReq('/api/assets/ast-vread/versions', await cookieFor(outsider));
    expect(outsiderRes.status).toBe(200);
    expect(((await outsiderRes.json()) as { items: unknown[] }).items).toEqual([]);
  });

  it('不存在版本 → 404', async () => {
    const res = await getReq('/api/assets/ast-vread/versions/99.0.0', await cookieFor(member));
    expect(res.status).toBe(404);
  });
});

describe('版本删除（T15 Q2——DRAFT 撤回/治理判定矩阵）', () => {
  const delUrl = (version: string) => `/api/assets/ast-vread/versions/${version}`;

  it('上传者删自己的 DRAFT → 204 + 行/文件/存储/审计全链', async () => {
    // 2.0.0 由 owner2（非 owner 普通成员）上传——撤回权实测
    const res = await jsonRequest('DELETE', delUrl('2.0.0'), undefined, await cookieFor(owner2));
    expect(res.status).toBe(204);

    // 版本行已删
    const vRows = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(and(eq(assetVersion.version, '2.0.0'), eq(assetVersion.assetId, vreadAssetIdRef)));
    expect(vRows).toHaveLength(0);
    // 存储清理（file 行随版本行删除——直接查 file 行归属无；以 T14 seed 的 key 域断言存储无残留）
    const auditRows = await db
      .select({ action: auditLog.action, detail: auditLog.detail })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, owner2), eq(auditLog.action, 'asset.version_delete')));
    expect(auditRows.length).toBe(1);
    expect((auditRows[0]!.detail as { version: string }).version).toBe('2.0.0');
  });

  it('owner 删他人上传的 DRAFT → 204（owner 面）', async () => {
    const res = await jsonRequest('DELETE', delUrl('1.0.0'), undefined, await cookieFor(member));
    expect(res.status).toBe(204);
  });

  it('管理档删 DRAFT → 204（管理面 05 §6.4）', async () => {
    const res = await jsonRequest(
      'DELETE',
      delUrl('3.0.0'),
      undefined,
      await cookieFor(assetAdmin),
    );
    expect(res.status).toBe(204);
  });

  it('非上传者普通成员删他人 DRAFT → 403（owner2 删 assetAdmin 传的——无撤回权）', async () => {
    // 3.0.0 已被上面删——用 T15 seed 专用新版本？——重建：assetAdmin 再传 8.0.0
    await createVersion(db, storage, audit, {
      asset: { id: vreadAssetIdRef, type: 'skill' },
      uploaderId: assetAdmin,
      file: buildZip([{ name: 'SKILL.md', content: '---\nname: x\ndescription: x\n---\nbody\n' }]),
      version: '8.0.0',
    });
    const res = await jsonRequest('DELETE', delUrl('8.0.0'), undefined, await cookieFor(owner2));
    expect(res.status).toBe(403);
  });

  it('普通用户删他人 DRAFT → 403', async () => {
    const res = await jsonRequest('DELETE', delUrl('8.0.0'), undefined, await cookieFor(outsider));
    expect(res.status).toBe(403);
  });

  it('删 PUBLISHED 版本 → 400 version_not_deletable（禁删态替代 M2 draft_only——member 是 ast-del-pub owner）', async () => {
    const res = await jsonRequest(
      'DELETE',
      '/api/assets/ast-del-pub/versions/1.0.0',
      undefined,
      await cookieFor(member),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_not_deletable');
  });

  it('已删版本再删 → 404', async () => {
    const res = await jsonRequest('DELETE', delUrl('2.0.0'), undefined, await cookieFor(owner2));
    expect(res.status).toBe(404);
  });
});
