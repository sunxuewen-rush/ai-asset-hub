import ldap from 'ldapjs';

/**
 * LDAP/AD 认证通道（05 §3.1 企业可选通道，默认关闭 LDAP_ENABLED=false）：
 * - LDAP_URLS 多 DC 故障转移（按序，连接类失败切下一 DC）
 * - auto 三重身份尝试：UPN（username 含 @）→ CN=<name>,<USER_BASE> → 裸名
 * - 目录侧禁用/凭据错 → denied（拒绝且不回退本地）；网络/超时 → unreachable（可回退）
 * - bind 成功后 search 自身属性（LDAP_USER_ID_ATTR / displayName）供自动建号
 */

export type LdapAuthResult =
  | { status: 'ok'; userId: string; displayName: string }
  | { status: 'denied' }
  | { status: 'unreachable' };

interface BindAttempt {
  ok: boolean;
  /** LDAP result code；无 code = 传输层错误（超时/断连） */
  ldapCode: number | null;
  message: string;
}

export interface LdapConfig {
  urls: string[]; // 多 DC，故障转移按序
  bindMode: string; // auto 或固定（M1 支持 auto）
  userBase: string; // 用户搜索基准 DN
  userIdAttr: string; // 建号 userId 来源属性（默认 sAMAccountName）
  displayNameAttr: string; // displayName 来源属性
  timeoutMs: number;
}

/** AD 账号禁用/过期检测（49 结果码扩展消息含 data 5xx 子码；导出于单测） */
export function isAccountDisabledMessage(message: string): boolean {
  return /\b(data\s+)?(531|533|701|773|775)\b/.test(message);
}

export class LdapChannel {
  constructor(private readonly config: LdapConfig) {}

  private bindCandidate(client: ldap.Client, dn: string, password: string): Promise<BindAttempt> {
    return new Promise((resolve) => {
      client.bind(dn, password, (err) => {
        if (err) {
          const ldapErr = err as Error & { code?: number };
          // err.code undefined = 传输层错误（连接/超时）；LDAP 应答必有结果码
          resolve({
            ok: false,
            ldapCode: typeof ldapErr.code === 'number' ? ldapErr.code : null,
            message: ldapErr.message,
          });
        } else {
          resolve({ ok: true, ldapCode: null, message: 'ok' });
        }
      });
    });
  }

  private searchSelf(
    client: ldap.Client,
    dn: string,
  ): Promise<{ userId: string; displayName: string }> {
    return new Promise((resolve) => {
      const attrs = [this.config.userIdAttr, this.config.displayNameAttr, 'cn'];
      client.search(
        dn,
        { scope: 'base', filter: '(objectClass=*)', attributes: attrs },
        (err, res) => {
          // search 失败 → 从 DN 提取 CN 兜底（保证建号可用）
          const fallback = (): void => {
            const cn = extractCn(dn);
            resolve({ userId: cn ?? dn, displayName: cn ?? dn });
          };
          if (err) {
            fallback();
            return;
          }
          let settled = false;
          res.on('searchEntry', (entry) => {
            if (settled) return;
            settled = true;
            const userId = firstValue(entry, this.config.userIdAttr);
            const displayName =
              firstValue(entry, this.config.displayNameAttr) ?? firstValue(entry, 'cn') ?? userId;
            resolve({ userId: userId ?? extractCn(dn) ?? dn, displayName: displayName ?? dn });
          });
          res.on('error', fallback);
          res.on('end', () => {
            if (!settled) fallback();
          });
        },
      );
    });
  }

  /** 候选 bind DN（auto 三重；固定模式 = CN 拼接 + 裸名） */
  private candidateDns(username: string): string[] {
    const candidates: string[] = [];
    if (username.includes('@')) {
      candidates.push(username); // UPN 直 bind
    }
    const localPart = username.includes('@') ? username.split('@')[0]! : username;
    if (this.config.userBase) {
      candidates.push(`CN=${localPart},${this.config.userBase}`);
    }
    candidates.push(username); // 裸名兜底
    return [...new Set(candidates)];
  }

  async authenticate(username: string, password: string): Promise<LdapAuthResult> {
    if (password === '') return { status: 'denied' };
    const dns = this.candidateDns(username);
    let sawDirectoryAnswer = false; // 任一 DC 给出 LDAP 应答（49/32 等）

    for (const url of this.config.urls) {
      const client = ldap.createClient({
        url,
        connectTimeout: this.config.timeoutMs,
        timeout: this.config.timeoutMs,
      });
      // 连接失败会异步 emit 'error'（bind 回调已携带错误）；无监听 → 未处理异常
      client.on('error', () => undefined);
      try {
        for (const dn of dns) {
          const attempt = await this.bindCandidate(client, dn, password);
          if (attempt.ok) {
            const self = await this.searchSelf(client, dn);
            return { status: 'ok', userId: self.userId, displayName: self.displayName };
          }
          if (attempt.ldapCode === null) {
            // 传输层错误（连接失败/超时）→ 切下一 DC（故障转移）
            break;
          }
          sawDirectoryAnswer = true;
          if (isAccountDisabledMessage(attempt.message)) {
            return { status: 'denied' }; // 目录侧禁用 → 拒绝且不回退
          }
          // 49 凭据错等：换下一身份形式（同一 DC）
        }
        // 当前 DC 尝试完毕：若有目录应答 → 目录已判定（凭据无效/无此用户）
        if (sawDirectoryAnswer) {
          return { status: 'denied' };
        }
      } catch {
        // createClient/bind 异常兜底 → 视为传输层，切下一 DC
      } finally {
        client.unbind(() => undefined);
      }
    }
    return { status: 'unreachable' };
  }
}

function extractCn(dn: string): string | undefined {
  const match = /(?:^|,)CN=([^,]+)/i.exec(dn);
  return match?.[1];
}

function firstValue(entry: ldap.SearchEntry, attr: string): string | undefined {
  const values = entry.attributes.find((a) => a.type.toLowerCase() === attr.toLowerCase())?.values;
  if (!values || values.length === 0) return undefined;
  return String(values[0]);
}
