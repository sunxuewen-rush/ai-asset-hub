import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import {
  asset,
  assetLabel,
  assetVersion,
  auditLog,
  labelDefinition,
  namespace,
  namespaceMember,
  userAccount,
} from '../db/schema/index.js';
import { LabelError } from '../labels/errors.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { rbacContext } from './auth-middleware.js';

const PREFIX = 'srch-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let ownerId: string;
let nsId: number;
let audit!: ReturnType<typeof createAuditWriter>;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let uploadRateLimiter!: InMemoryRateLimiter;
let viewerUser: string;

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'srch-http');
  return `aih_session=${sid}`;
}
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof AssetError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof ReviewError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof LabelError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  return app;
}

let seq = 0;

async function seedAsset(
  slug: string,
  meta?: { name?: string; description?: string; searchText?: string },
): Promise<number> {
  const [a] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug, type: 'skill', ownerId })
    .returning({ id: asset.id });
  if (meta) {
    await db.insert(assetVersion).values({
      assetId: a!.id,
      version: '1.0.0',
      status: 'PUBLISHED',
      createdBy: ownerId,
      publishedAt: new Date(),
      parsedMetadataJson: meta as Record<string, unknown>,
    });
  }
  return a!.id;
}
async function seedLabel(slug: string) {
  const [r] = await db
    .insert(labelDefinition)
    .values({ slug, type: 'RECOMMENDED', createdBy: ownerId })
    .returning({ id: labelDefinition.id });
  return r!.id;
}
async function attach(assetId: number, labelId: number) {
  await db.insert(assetLabel).values({ assetId, labelId, createdBy: ownerId });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'srch-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  ownerId = await makeUser('owner');
  viewerUser = await makeUser('viewer');
  const [ns] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
    .returning({ id: namespace.id });
  nsId = ns!.id;
  await db.insert(namespaceMember).values([
    { namespaceId: nsId, userId: ownerId, role: 'OWNER' },
    { namespaceId: nsId, userId: viewerUser, role: 'MEMBER' },
  ]);
});

afterAll(async () => {
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.id, `${PREFIX}%`));
  await db.delete(assetLabel).where(like(assetLabel.createdBy, `${PREFIX}%`));
  await db.delete(labelDefinition).where(like(labelDefinition.createdBy, `${PREFIX}%`));
  await db.delete(assetVersion).where(like(assetVersion.createdBy, `${PREFIX}%`));
  await db.delete(asset).where(like(asset.ownerId, `${PREFIX}%`));
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const u of users) {
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

async function search(query: string, cookie?: string) {
  const headers: Record<string, string> = {
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  const res = await buildApp().request(`/api/assets?${query}`, { method: 'GET', headers });
  return (await res.json()) as { items: Array<{ slug: string }>; total: number };
}

describe('搜索扩展（design §6 R12）', () => {
  it('q 命中 slug（ILIKE 子串）', async () => {
    const target = `${PREFIX}alpha-${++seq}`;
    await seedAsset(target);
    const cookie = await cookieFor(viewerUser);
    const body = await search(`q=${encodeURIComponent('alpha')}`, cookie);
    expect(body.items.some((i) => i.slug === target)).toBe(true);
  });

  it('q 命中版本投影 searchText（01 §3.2——≤500 正文摘要）', async () => {
    const target = `${PREFIX}proj-${++seq}`;
    await seedAsset(target, { name: 'demo skill', searchText: 'frobnicate the widget engine' });
    const cookie = await cookieFor(viewerUser);
    const body = await search(`q=${encodeURIComponent('frobnicate')}`, cookie);
    expect(body.items.some((i) => i.slug === target)).toBe(true);
  });

  it('q 命中版本投影 name/description', async () => {
    const byName = `${PREFIX}byname-${++seq}`;
    const byDesc = `${PREFIX}bydesc-${++seq}`;
    await seedAsset(byName, { name: 'scheduler helper' });
    await seedAsset(byDesc, { description: 'resolves cron expressions fast' });
    const cookie = await cookieFor(viewerUser);
    const nameHit = await search('q=scheduler', cookie);
    expect(nameHit.items.some((i) => i.slug === byName)).toBe(true);
    const descHit = await search('q=cron', cookie);
    expect(descHit.items.some((i) => i.slug === byDesc)).toBe(true);
  });

  it('label 多值 OR：挂任一命中；未挂的 label 不命中', async () => {
    const labA = `${PREFIX}cat-a-${++seq}`;
    const labB = `${PREFIX}cat-b-${++seq}`;
    const idA = await seedLabel(labA);
    const idB = await seedLabel(labB);
    const assetA = `${PREFIX}or-a-${++seq}`;
    const assetB = `${PREFIX}or-b-${++seq}`;
    const plain = `${PREFIX}or-plain-${++seq}`;
    const aId = await seedAsset(assetA);
    const bId = await seedAsset(assetB);
    await seedAsset(plain);
    await attach(aId, idA);
    await attach(bId, idB);

    const cookie = await cookieFor(viewerUser);
    const body = await search(`label=${labA}&label=${labB}`, cookie);
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain(assetA);
    expect(slugs).toContain(assetB);
    expect(slugs).not.toContain(plain);
  });

  it('label 不存在（已删/未知 slug）→ 视为无筛选不报错（06 §4 兜底）', async () => {
    const target = `${PREFIX}ghost-${++seq}`;
    await seedAsset(target);
    const cookie = await cookieFor(viewerUser);
    const body = await search('label=ghost-category', cookie);
    expect(body.items.some((i) => i.slug === target)).toBe(true); // 全量返回
  });

  it('q 无命中 → 空列表不报错', async () => {
    const cookie = await cookieFor(viewerUser);
    const body = await search('q=zzz-nomatch-xyz', cookie);
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });
});
