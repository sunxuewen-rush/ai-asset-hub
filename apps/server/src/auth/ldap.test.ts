import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import ldap from 'ldapjs';
import { isAccountDisabledMessage, LdapChannel } from './ldap.js';

/**
 * 真实 fake LDAP server（ldapjs 起本地服务，网络层真实请求——禁 mock 服务模块）：
 * 目录模型：ou=people,dc=example,dc=com 下 alice（密码 pw-123）/ bob（禁用）/ carol（UPN 登录）
 */

const BASE = 'ou=people,dc=example,dc=com';

interface FakeUser {
  dn: string;
  upn?: string;
  password: string;
  disabled?: boolean;
  sam: string;
  displayName: string;
}

const users: FakeUser[] = [
  {
    dn: `CN=alice,${BASE}`,
    upn: 'alice@example.com',
    password: 'pw-123',
    sam: 'alice',
    displayName: 'Alice Wu',
  },
  { dn: `CN=bob,${BASE}`, password: 'pw-456', disabled: true, sam: 'bob', displayName: 'Bob Li' },
  {
    dn: `CN=carol,${BASE}`,
    upn: 'carol@example.com',
    password: 'pw-789',
    sam: 'carol',
    displayName: 'Carol Chen',
  },
];

function findUser(dn: string): FakeUser | undefined {
  const lower = dn.toLowerCase();
  return users.find(
    (u) => u.dn.toLowerCase() === lower || (u.upn !== undefined && u.upn.toLowerCase() === lower),
  );
}

const LDAP_INVALID_CREDENTIALS = 49; // @types/ldapjs 未导出错误码常量，直接用 LDAP 标准值

function startFakeServer(): Promise<{ server: ldap.Server; port: number }> {
  return new Promise((resolve) => {
    const server = ldap.createServer();
    // bind：精确 UPN 或 base 后缀 DN
    server.bind(BASE, (req: any, res: any) => {
      const entry = findUser(req.dn.toString());
      if (!entry) {
        res.send(LDAP_INVALID_CREDENTIALS);
        return;
      }
      if (entry.disabled) {
        res.send(LDAP_INVALID_CREDENTIALS);
        return;
      }
      if (req.credentials !== entry.password) {
        res.send(LDAP_INVALID_CREDENTIALS);
        return;
      }
      res.end();
    });
    server.bind('dc=example,dc=com', (req: any, res: any) => {
      res.send(LDAP_INVALID_CREDENTIALS);
    });
    // search（读自身属性，base scope）。
    // 注：ldapjs v3 服务端 send entry 的属性编码/过滤行为异常（白名单过滤大小写敏感 +
    // 属性序列化问题），fake 不返回属性 → 客户端走 CN 兜底（searchSelf 的 fallback 路径）。
    // searchSelf 属性增强路径留真实 LDAP/AD 服务器验证（T26 人工项）。
    server.search(BASE, (req: any, res: any) => {
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      const address = (
        server as unknown as { address: () => { port: number } | string | null }
      ).address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

let fake: { server: ldap.Server; port: number } | undefined;
let channelUrl: string;

function makeChannel(urls: string[]): LdapChannel {
  return new LdapChannel({
    urls,
    bindMode: 'auto',
    userBase: BASE,
    userIdAttr: 'sAMAccountName',
    displayNameAttr: 'displayName',
    timeoutMs: 2000,
  });
}

beforeAll(async () => {
  fake = await startFakeServer();
  channelUrl = `ldap://127.0.0.1:${fake.port}`;
});

afterAll(() => {
  fake?.server.close(() => undefined);
});

describe('isAccountDisabledMessage', () => {
  it('detects AD account-disabled subcodes in 49 messages', () => {
    expect(
      isAccountDisabledMessage(
        '80090308: LdapErr: DSID-0C090334, comment: AcceptSecurityContext error, data 533, v3839',
      ),
    ).toBe(true);
    expect(isAccountDisabledMessage('data 701, v3839')).toBe(true);
    expect(isAccountDisabledMessage('data 52e, v3839')).toBe(false); // 密码错
    expect(isAccountDisabledMessage('Invalid Credentials')).toBe(false);
  });
});

describe('LdapChannel.authenticate', () => {
  it('binds via CN construction and falls back to CN identity when attrs unavailable', async () => {
    const result = await makeChannel([channelUrl]).authenticate('alice', 'pw-123');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      // fake server 不返回属性 → CN 兜底（真实 DC 返回 sAMAccountName/displayName 增强）
      expect(result.userId).toBe('alice');
      expect(result.displayName).toBe('alice');
    }
  });

  it('binds via UPN form', async () => {
    const result = await makeChannel([channelUrl]).authenticate('carol@example.com', 'pw-789');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.userId).toBe('carol');
    }
  });

  it('returns denied for wrong password (directory authority)', async () => {
    const result = await makeChannel([channelUrl]).authenticate('alice', 'wrong-pass');
    expect(result.status).toBe('denied');
  });

  it('returns denied for disabled account', async () => {
    const result = await makeChannel([channelUrl]).authenticate('bob', 'pw-456');
    expect(result.status).toBe('denied');
  });

  it('returns denied for unknown user', async () => {
    const result = await makeChannel([channelUrl]).authenticate('ghost', 'whatever');
    expect(result.status).toBe('denied');
  });

  it('fails over to the second DC when the first is unreachable', async () => {
    // 127.0.0.1:1 无服务（连接拒绝）→ 故障转移到 fake server
    const result = await makeChannel(['ldap://127.0.0.1:1', channelUrl]).authenticate(
      'alice',
      'pw-123',
    );
    expect(result.status).toBe('ok');
  });

  it('returns unreachable when all DCs are unreachable', async () => {
    const result = await makeChannel(['ldap://127.0.0.1:1', 'ldap://127.0.0.1:2']).authenticate(
      'alice',
      'pw-123',
    );
    expect(result.status).toBe('unreachable');
  });

  it('returns denied for empty password without touching the network', async () => {
    const result = await makeChannel([channelUrl]).authenticate('alice', '');
    expect(result.status).toBe('denied');
  });
});
