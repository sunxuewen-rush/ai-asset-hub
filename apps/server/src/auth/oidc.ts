import { allowInsecureRequests, discovery } from 'openid-client';
import { getEnv } from '../config/env.js';

/**
 * OIDC 客户端工厂（T23，05 §3/§5 OIDC 授权码流；R5 openid-client v6 标准库）：
 * - 工厂参数化（R6/S6）：config 含 discoveryUrl/clientId/clientSecret/redirectUrl——
 *   多 Provider 即多实例，注册表后置
 * - openid-client v6 函数式 API：discovery() → Configuration（含 server metadata
 *   + client metadata + 默认 ClientSecretPost 客户端认证）
 * - getOidcClient() 惰性单例：OIDC_ENABLED=false → null（不触网）；启用才做
 *   discovery（真实网络依赖，诚实标注——单测覆盖 disabled 分支，enabled 路径由
 *   T28 fake issuer 冒烟）
 */

export interface OidcClientConfig {
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

export async function createOidcClient(config: OidcClientConfig) {
  // metadata 含 client_secret → 默认 ClientSecretPost 客户端认证（v6 doc 语义）
  const url = new URL(config.discoveryUrl);
  // http 仅 localhost 开发例外（env 层已强制 https 或 localhost；此处放行库层
  // checkProtocol——T28 fake issuer / 自托管本地 IdP 走同路）
  const httpLocal = url.protocol === 'http:';
  return discovery(
    url,
    config.clientId,
    {
      client_secret: config.clientSecret,
      redirect_uris: [config.redirectUrl],
    },
    undefined,
    httpLocal ? { execute: [allowInsecureRequests] } : undefined,
  );
}

export type OidcClient = Awaited<ReturnType<typeof createOidcClient>>;

/** 回调地址推导（OIDC_REDIRECT_URL 缺省时）：PUBLIC_BASE_URL + /api/auth/oidc/callback */
export function oidcRedirectUrl(baseUrl: string, configured?: string): string {
  return configured ?? `${baseUrl.replace(/\/$/, '')}/api/auth/oidc/callback`;
}

let cached: Promise<OidcClient | null> | null = null;

/** 惰性单例：disabled → null（不触网）；enabled → discovery（失败即 reject，路由层出 500） */
export function getOidcClient(): Promise<OidcClient | null> {
  cached ??= loadOidcClient();
  return cached;
}

async function loadOidcClient(): Promise<OidcClient | null> {
  const env = getEnv();
  if (!env.OIDC_ENABLED) return null;
  return createOidcClient({
    discoveryUrl: env.OIDC_DISCOVERY_URL,
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    redirectUrl: oidcRedirectUrl(env.PUBLIC_BASE_URL, env.OIDC_REDIRECT_URL),
  });
}

/** 测试用：清单例缓存（配合 resetEnvCache 重读 env） */
export function resetOidcClientCache(): void {
  cached = null;
}
