import { randomBytes } from 'node:crypto';

/**
 * Device Flow pending store（T29，RFC 8628 · 05 §5 CLI 通道）：
 * 内存 Map（同 Session 模式）——device_code → pending 记录。
 * - device_code：32B base64url（CLI 轮询凭证）
 * - user_code：8 位 base32（无易混字符 0/O/1/I/8/B——肉眼可抄写，用户确认页输入）
 * - TTL 10min 惰性过期清理；approve 幂等（已绑定 userId 的 pending 再 approve 无效）
 * 多实例共享存储为部署期配置项（同 Session 模式注记）。
 */

export const DEVICE_TTL_MS = 10 * 60 * 1000;

/** base32 免混淆字母表（去 0/O/1/I/8/B） */
const USER_CODE_ALPHABET = '2345679ACDEFGHJKMNPQRSTUVWXYZ';
const USER_CODE_LENGTH = 8;

export interface DevicePending {
  deviceCode: string;
  userCode: string;
  /** 浏览器侧未确认时为 null；approve 后绑定 */
  userId: string | null;
  createdAt: number;
  expiresAt: number;
}

function randomBase32Code(): string {
  let code = '';
  for (let i = 0; i < USER_CODE_LENGTH; i += 1) {
    code += USER_CODE_ALPHABET[randomBytes(1)[0]! % USER_CODE_ALPHABET.length];
  }
  return code;
}

export class DevicePendingStore {
  private readonly pendings = new Map<string, DevicePending>();

  constructor(private readonly ttlMs: number = DEVICE_TTL_MS) {}

  /** 签发新 pending（device 32B base64url / user 8 位免混淆）；user_code 碰撞则重抽 */
  async create(userId: string | null = null, now: number = Date.now()): Promise<DevicePending> {
    const deviceCode = randomBytes(32).toString('base64url');
    let userCode = randomBase32Code();
    while ([...this.pendings.values()].some((p) => p.userCode === userCode)) {
      userCode = randomBase32Code();
    }
    const pending: DevicePending = {
      deviceCode,
      userCode,
      userId,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.pendings.set(deviceCode, pending);
    return pending;
  }

  /** device_code 查（惰性过期清理） */
  async getByDevice(deviceCode: string, now: number = Date.now()): Promise<DevicePending | null> {
    const pending = this.pendings.get(deviceCode);
    if (!pending) return null;
    if (pending.expiresAt <= now) {
      this.pendings.delete(deviceCode);
      return null;
    }
    return pending;
  }

  /** 不过期过滤的裸查（T32：区分 expired 401 与 unknown 404——轮询端点语义需要） */
  peek(deviceCode: string): DevicePending | undefined {
    return this.pendings.get(deviceCode);
  }

  /** user_code 查（大小写不敏感——用户手动输入；T33） */
  async getByUser(userCode: string, now: number = Date.now()): Promise<DevicePending | null> {
    const normalized = userCode.trim().toUpperCase();
    for (const pending of this.pendings.values()) {
      if (pending.expiresAt <= now) {
        this.pendings.delete(pending.deviceCode);
        continue;
      }
      if (pending.userCode === normalized) return pending;
    }
    return null;
  }

  /** 绑定用户（approve）；幂等：pending 不存在/已过期返回 null */
  async approve(deviceCode: string, userId: string, now: number = Date.now()): Promise<boolean> {
    const pending = await this.getByDevice(deviceCode, now);
    if (!pending) return false;
    // 幂等：已绑定同用户 → true（不重写）；异用户（理论不可达——code 不可猜）→ 拒绝
    if (pending.userId !== null && pending.userId !== userId) return false;
    pending.userId = userId;
    return true;
  }

  /** 显式拒绝/清除（错码重试多次后由路由层调用） */
  async reject(deviceCode: string): Promise<void> {
    this.pendings.delete(deviceCode);
  }

  /** 周期清理全部过期（供 server 定时器；防内存无限增长） */
  sweep(now: number = Date.now()): number {
    let removed = 0;
    for (const [code, pending] of this.pendings) {
      if (pending.expiresAt <= now) {
        this.pendings.delete(code);
        removed += 1;
      }
    }
    return removed;
  }
}
