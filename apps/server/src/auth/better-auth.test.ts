import { describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';
import { resetEnvCache } from '../config/env.js';
import { getDb } from '../db/client.js';
import { auditLog, user } from '../db/schema/index.js';
import {
  createAuth,
  EXTERNAL_PROVIDER_IDS,
  parseTrustedOrigins,
  shouldRecordExternalProvision,
} from './better-auth.js';

/**
 * `better-auth` 装配面测试（两组）。
 *
 * ① **Origin 白名单解析**（design §4.3 R9 · §2.1 R9）：env 里是**逗号分隔串**（空 = 仅同源）；
 *   解析必须容忍书写噪声（空格/空段/尾逗号），且**不得**把空段变成 `''` 白名单项
 *   ——一个空字符串进白名单等于放行任意同形 origin（安全面）。
 * ② **M4c-3 T2 外部身份源装配**（批 design §3.2 · 测试层 **L1 / L2**）：`ENTRA_*` / `SOCIAL_*`
 *   由 env **条件装配** ⇒ 关态「未装配 ⇒ 404 `PROVIDER_NOT_FOUND`」· 开态「装配且
 *   `tenantId` 接入授权 URL」。断言走**官方端点行为**（不读内部结构）。
 *
 * 注：② 需构造实例 ⇒ 本文件设 `DATABASE_URL` / `SESSION_SECRET`（同 `app.test.ts` 范式），
 * 用例内用 `resetEnvCache()` 切换 env（实例构造惰性：不建连接 / 不触网）。
 */

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

/** 本批涉及的全部 provider env 键（用例前后逐键复位，互不串味） */
const PROVIDER_ENV_KEYS = [
  'ENTRA_ENABLED',
  'ENTRA_CLIENT_ID',
  'ENTRA_CLIENT_SECRET',
  'ENTRA_TENANT_ID',
  'SOCIAL_GOOGLE_ENABLED',
  'SOCIAL_GOOGLE_CLIENT_ID',
  'SOCIAL_GOOGLE_CLIENT_SECRET',
  'SOCIAL_GITHUB_ENABLED',
  'SOCIAL_GITHUB_CLIENT_ID',
  'SOCIAL_GITHUB_CLIENT_SECRET',
  'SOCIAL_WECHAT_ENABLED',
  'SOCIAL_WECHAT_CLIENT_ID',
  'SOCIAL_WECHAT_CLIENT_SECRET',
] as const;

/** 以给定 provider env 跑一段断言，随后**逐键复位**（新增键一并删除 ⇒ 不污染其他用例） */
async function withProviderEnv(
  vars: Record<string, string>,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = new Map(PROVIDER_ENV_KEYS.map((k) => [k, process.env[k]] as const));
  try {
    for (const k of PROVIDER_ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(vars)) process.env[k] = v;
    resetEnvCache();
    await fn();
  } finally {
    for (const [k, v] of prev) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetEnvCache();
  }
}

/** 只挂官方 handler 于 `/api/auth/*`（同 `app.ts:147` 的挂法；不引入整个 app） */
function minimalAuthApp(): Hono {
  const auth = createAuth({});
  const app = new Hono();
  app.all('/api/auth/*', (c) => auth.handler(c.req.raw));
  return app;
}

/** `POST /api/auth/sign-in/social`（官方社交通道；成功 = 200 `{ url, redirect: true }`） */
async function signInSocial(
  provider: string,
): Promise<{ status: number; body: { url?: string; code?: string } }> {
  const res = await minimalAuthApp().request('/api/auth/sign-in/social', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ provider, callbackURL: '/' }),
  });
  return { status: res.status, body: (await res.json()) as { url?: string; code?: string } };
}

describe('parseTrustedOrigins：逗号分隔 Origin 白名单', () => {
  test('空串 ⇒ 空数组（= 仅同源，安全默认）', () => {
    expect(parseTrustedOrigins('')).toEqual([]);
  });

  test('未设置（只含空白的串）⇒ 空数组', () => {
    expect(parseTrustedOrigins('   ')).toEqual([]);
    expect(parseTrustedOrigins('\n')).toEqual([]);
  });

  test('单值原样返回（dev 场景：web 源）', () => {
    expect(parseTrustedOrigins('http://localhost:5173')).toEqual(['http://localhost:5173']);
  });

  test('多值：按逗号切分并各段 trim', () => {
    expect(parseTrustedOrigins('http://localhost:5173, http://localhost:3000')).toEqual([
      'http://localhost:5173',
      'http://localhost:3000',
    ]);
  });

  test('书写噪声（空段 / 首尾逗号 / 多余空格）不产生空项', () => {
    const parsed = parseTrustedOrigins(' http://a.test , ,http://b.test, ');
    expect(parsed).toEqual(['http://a.test', 'http://b.test']);
    expect(parsed).not.toContain('');
  });

  test('通配形态（官方 trustedOrigins 支持）原样透传，不做本地改写', () => {
    expect(parseTrustedOrigins('*.example.test')).toEqual(['*.example.test']);
  });
});

describe('M4c-3 T2：外部身份源装配（L1 两态 · L2 降级）', () => {
  test('L2 关态：四个 provider 全未装配 ⇒ sign-in/social 逐个 404 PROVIDER_NOT_FOUND', async () => {
    await withProviderEnv({}, async () => {
      for (const provider of ['microsoft', 'google', 'github', 'wechat']) {
        const res = await signInSocial(provider);
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('PROVIDER_NOT_FOUND');
      }
    });
  });

  test('L1 开态：Entra 装配 ⇒ 200 且 tenantId 接入授权 URL（本租户段实锤）', async () => {
    const TENANT = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await withProviderEnv(
      {
        ENTRA_ENABLED: 'true',
        ENTRA_CLIENT_ID: 'api://aih-test',
        ENTRA_CLIENT_SECRET: 's3cret',
        ENTRA_TENANT_ID: TENANT,
      },
      async () => {
        const res = await signInSocial('microsoft');
        expect(res.status).toBe(200);
        expect(res.body.url).toContain(`login.microsoftonline.com/${TENANT}/`);
        expect(res.body.url).toContain('oauth2/v2.0/authorize');
        // 启用集隔离：未启用的社交通道不受影响
        expect((await signInSocial('google')).status).toBe(404);
      },
    );
  });

  test('L1 开态：社交三通道各自装配（授权 URL 指向各自官方端点）', async () => {
    await withProviderEnv(
      {
        SOCIAL_GOOGLE_ENABLED: 'true',
        SOCIAL_GOOGLE_CLIENT_ID: 'g-id',
        SOCIAL_GOOGLE_CLIENT_SECRET: 'g-s',
        SOCIAL_GITHUB_ENABLED: 'true',
        SOCIAL_GITHUB_CLIENT_ID: 'h-id',
        SOCIAL_GITHUB_CLIENT_SECRET: 'h-s',
        SOCIAL_WECHAT_ENABLED: 'true',
        SOCIAL_WECHAT_CLIENT_ID: 'w-id',
        SOCIAL_WECHAT_CLIENT_SECRET: 'w-s',
      },
      async () => {
        expect((await signInSocial('google')).body.url).toContain('accounts.google.com');
        expect((await signInSocial('github')).body.url).toContain(
          'github.com/login/oauth/authorize',
        );
        expect((await signInSocial('wechat')).body.url).toContain('open.weixin.qq.com');
        // Entra 未启用 ⇒ 仍 404
        expect((await signInSocial('microsoft')).status).toBe(404);
      },
    );
  });
});

/**
 * M4c-3 **T5**：外部通道建号审计（`external.provisioned` · 批 design §3.6 **v0.8 定案**）。
 *
 * 判据（纯函数）：`providerId ∈ 四通道` **且** 该用户此刻**仅此一条** account 行 ⇒ 首登建号。
 * 负例（真库真端点）：本地自助注册走 `credential` 通道 ⇒ 必须**零** `external.provisioned` 行。
 * ⚠ **诚实标注**：正例（真外部回调 ⇒ 记 `external.provisioned` / `auth.login.success`）依赖真 IdP
 * ⇒ 归 **L5 假 issuer（T10）**，本文件不伪造。
 */
async function countExternalProvisions(): Promise<number> {
  const rows = await getDb()
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(eq(auditLog.action, 'external.provisioned'));
  return rows.length;
}

describe('M4c-3 T5 · 外部通道建号审计（external.provisioned）', () => {
  test('纯函数判据：四通道 × account 数 1 ⇒ true；非四通道 或 计数 ≠ 1 ⇒ false', () => {
    for (const p of EXTERNAL_PROVIDER_IDS) expect(shouldRecordExternalProvision(p, 1)).toBe(true);
    for (const p of ['credential', 'ldap', 'wechatx', '']) {
      expect(shouldRecordExternalProvision(p, 1)).toBe(false);
    }
    for (const p of EXTERNAL_PROVIDER_IDS) {
      expect(shouldRecordExternalProvision(p, 2)).toBe(false); // 链接既有账号 ⇒ 不记建号
      expect(shouldRecordExternalProvision(p, 0)).toBe(false); // 不该发生
    }
  });

  test('负例（真库真端点）：本地自助注册（credential）⇒ 零 external.provisioned 行', async () => {
    const db = getDb();
    await migrate(db, { migrationsFolder: './drizzle' });
    const email = `m4c3t5-${randomUUID()}@test.local`;
    const before = await countExternalProvisions();

    const prev = process.env.REGISTRATION_ENABLED;
    process.env.REGISTRATION_ENABLED = 'true';
    resetEnvCache();
    let createdId: string | null = null;
    try {
      const res = await minimalAuthApp().request('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, password: 'pw-m4c3-t5-12', name: 'm4c3t5' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { user?: { id?: string } };
      createdId = body.user?.id ?? null;
      expect(createdId).toBeTruthy();
    } finally {
      process.env.REGISTRATION_ENABLED = prev;
      resetEnvCache();
    }

    expect(await countExternalProvisions()).toBe(before); // 零新增（credential 通道被过滤）

    // 收尾：删本用例建的行（`audit_log.actor_id` 有 FK ⇒ 先删审计；session/account 级联）
    if (createdId) {
      await db.delete(auditLog).where(eq(auditLog.actorId, createdId));
      await db.delete(user).where(eq(user.id, createdId));
      const left = await db.select({ id: user.id }).from(user).where(eq(user.id, createdId));
      expect(left.length).toBe(0);
    }
  });
});
