import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import { asset, namespace, userAccount } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { getPublicStats, type PublicStats } from '../assets/stats.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { createStatsRoutes } from './stats.js';

const PREFIX = 'stt-';
let db: Db;
let baseline: PublicStats;
let nsActive: number;
let nsFrozen: number;
let ownerId: string;

async function makeUser(tag: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function insertNs(slug: string, status: 'ACTIVE' | 'FROZEN' | 'ARCHIVED' = 'ACTIVE'): Promise<number> {
  const rows = await db
    .insert(namespace)
    .values({ slug, displayName: `${PREFIX}${slug}`, type: 'TEAM', status })
    .returning({ id: namespace.id });
  return rows[0]!.id;
}
async function insertAsset(ns: number, slug: string, type: string, visibility: string, status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED' = 'ACTIVE', dl = 0) {
  await db
    .insert(asset)
    .values({ namespaceId: ns, slug, type: type as never, ownerId, visibility: visibility as never, status, downloadCount: dl })
    .onConflictDoNothing();
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  ownerId = await makeUser('owner');
  nsActive = await insertNs('stt-ns-active');
  nsFrozen = await insertNs('stt-ns-frozen', 'FROZEN');
  // 基线快照（共享测试库非隔离——聚合断言用增量：base 紧贴 seed，窗口毫秒级）
  baseline = await getPublicStats(db);
  // 可见性矩阵：PUBLIC（skill/mcp/agent 各 + 带下载量）/ PRIVATE / NAMESPACE_ONLY / 非 ACTIVE / FROZEN 空间
  await insertAsset(nsActive, 'stt-pub-skill', 'skill', 'PUBLIC', 'ACTIVE', 100);
  await insertAsset(nsActive, 'stt-pub-mcp', 'mcp', 'PUBLIC', 'ACTIVE', 40);
  await insertAsset(nsActive, 'stt-pub-agent', 'agent', 'PUBLIC', 'ACTIVE', 10);
  await insertAsset(nsActive, 'stt-priv-skill', 'skill', 'PRIVATE', 'ACTIVE', 999);
  await insertAsset(nsActive, 'stt-ns-only-mcp', 'mcp', 'NAMESPACE_ONLY', 'ACTIVE', 999);
  await insertAsset(nsActive, 'stt-hidden-asset', 'skill', 'PUBLIC', 'HIDDEN', 999);
  await insertAsset(nsFrozen, 'stt-frozen-ns-pub', 'skill', 'PUBLIC', 'ACTIVE', 999);
});

afterAll(async () => {
  // 前缀清理（禁全表 delete——纪律）：slug/ns slug 均带 stt- 前缀
  await db.delete(asset).where(like(asset.slug, `${PREFIX}%`)).catch(() => {});
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`)).catch(() => {});
  await db.delete(userAccount).where(like(userAccount.id, 'usr_%')).catch(() => {});
  await db.$client.end();
});

describe('GET /api/stats（M4a R7——匿名公开聚合）', () => {
  it('匿名 200：仅 PUBLIC+ACTIVE+ACTIVE 空间计入；typeCounts 动态键', async () => {
    const app = new Hono();
    app.route('/api/stats', createStatsRoutes({ db }));
    const res = await app.request('/api/stats');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalAssets: number;
      totalDownloads: number;
      typeCounts: Record<string, number>;
    };
    // 增量：本文件 seed 的 PUBLIC 3 个（skill/mcp/agent 各一，下载 100+40+10）；
    // PRIVATE/NAMESPACE_ONLY/HIDDEN/FROZEN 空间一律不计（999 排除）
    expect(body.totalAssets - baseline.totalAssets).toBe(3);
    expect((body.typeCounts.skill ?? 0) - (baseline.typeCounts.skill ?? 0)).toBe(1);
    expect((body.typeCounts.mcp ?? 0) - (baseline.typeCounts.mcp ?? 0)).toBe(1);
    expect((body.typeCounts.agent ?? 0) - (baseline.typeCounts.agent ?? 0)).toBe(1);
    expect(body.totalDownloads - baseline.totalDownloads).toBe(150);
  });
});
