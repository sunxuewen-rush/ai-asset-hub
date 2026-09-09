import { describe, expect, it } from 'bun:test';
import { canViewAsset, type VisibilityInput } from './visibility.js';

/** 数据驱动矩阵（design §7/08 §5.1 读面语义逐格验证） */
function cases(): Array<{ name: string; input: VisibilityInput; expected: boolean }> {
  const owner = 'usr_owner';
  const other = 'usr_other';
  const base = {
    nsStatus: 'ACTIVE',
    assetStatus: 'ACTIVE',
    ownerId: owner,
  } as const;

  return [
    // —— PUBLIC：全站可见（含匿名）——
    {
      name: 'PUBLIC × 匿名 → 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        viewerId: null,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'PUBLIC × 非成员登录 → 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        viewerId: other,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: true,
    },
    // —— NAMESPACE_ONLY：空间成员可见 ——
    {
      name: 'NAMESPACE_ONLY × 非成员 → 不可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: other,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'NAMESPACE_ONLY × 匿名 → 不可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: null,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'NAMESPACE_ONLY × MEMBER → 可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: other,
        namespaceRole: 'MEMBER',
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'NAMESPACE_ONLY × ADMIN → 可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: other,
        namespaceRole: 'ADMIN',
        isSuperAdmin: false,
      },
      expected: true,
    },
    // —— PRIVATE：owner 或空间 ADMIN+ ——
    {
      name: 'PRIVATE × owner → 可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: owner,
        namespaceRole: 'MEMBER',
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'PRIVATE × owner（非成员）→ 可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: owner,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'PRIVATE × 匿名 → 不可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: null,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'PRIVATE × 非 owner MEMBER → 不可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: other,
        namespaceRole: 'MEMBER',
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'PRIVATE × 非 owner ADMIN → 可见（05 §6.5 管理面）',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: other,
        namespaceRole: 'ADMIN',
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'PRIVATE × 非 owner 空间 OWNER → 可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: other,
        namespaceRole: 'OWNER',
        isSuperAdmin: false,
      },
      expected: true,
    },
    // —— asset.status：HIDDEN/ARCHIVED 仅超管 ——
    {
      name: 'HIDDEN × owner → 不可见（仅超管）',
      input: {
        ...base,
        visibility: 'PUBLIC',
        assetStatus: 'HIDDEN',
        viewerId: owner,
        namespaceRole: 'OWNER',
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'HIDDEN × SUPER_ADMIN → 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        assetStatus: 'HIDDEN',
        viewerId: other,
        namespaceRole: null,
        isSuperAdmin: true,
      },
      expected: true,
    },
    {
      name: 'ARCHIVED × 普通用户 → 不可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        assetStatus: 'ARCHIVED',
        viewerId: other,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: false,
    },
    // —— namespace.status ARCHIVED：空间对外关闭 ——
    {
      name: 'ns ARCHIVED × PUBLIC 非成员 → 不可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        nsStatus: 'ARCHIVED',
        viewerId: other,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'ns ARCHIVED × PUBLIC 成员 → 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        nsStatus: 'ARCHIVED',
        viewerId: other,
        namespaceRole: 'MEMBER',
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'ns ARCHIVED × SUPER_ADMIN → 可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        nsStatus: 'ARCHIVED',
        viewerId: null,
        namespaceRole: null,
        isSuperAdmin: true,
      },
      expected: true,
    },
    // —— ns FROZEN：只读不影响读面 ——
    {
      name: 'ns FROZEN × PUBLIC 匿名 → 可见（只读）',
      input: {
        ...base,
        visibility: 'PUBLIC',
        nsStatus: 'FROZEN',
        viewerId: null,
        namespaceRole: null,
        isSuperAdmin: false,
      },
      expected: true,
    },
  ];
}

describe('canViewAsset（08 §5.1 可见性矩阵）', () => {
  for (const c of cases()) {
    it(c.name, () => {
      expect(canViewAsset(c.input)).toBe(c.expected);
    });
  }
});
