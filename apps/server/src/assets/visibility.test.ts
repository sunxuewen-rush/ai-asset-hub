import { describe, expect, it } from 'bun:test';
import { canViewAsset, type VisibilityInput } from './visibility.js';

/** 数据驱动矩阵（design §7/08 §5.1 读面语义逐格验证；M4-pre S2：空间维度已删除） */
function cases(): Array<{ name: string; input: VisibilityInput; expected: boolean }> {
  const owner = 'usr_owner';
  const other = 'usr_other';
  const base = {
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
        isSuperAdmin: false,
      },
      expected: true,
    },
    // —— NAMESPACE_ONLY：空间成员面已删 → 退化为 owner-only（M4-pre §2.3）——
    {
      name: 'NAMESPACE_ONLY × 非成员 → 不可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: other,
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
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'NAMESPACE_ONLY × 非 owner 登录（原空间成员面已删）→ 不可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'NAMESPACE_ONLY × 非 owner 管理档（原空间管理面已删）→ 不可见',
      input: {
        ...base,
        visibility: 'NAMESPACE_ONLY',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: false,
    },
    // —— PRIVATE：owner-only（空间管理面随空间删除）——
    {
      name: 'PRIVATE × owner → 可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: owner,
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
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'PRIVATE × 非 owner → 不可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'PRIVATE × 非 owner 管理档（原空间管理面已删）→ 不可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: false,
    },
    {
      name: 'PRIVATE × 非 owner（原空间 OWNER 面已删）→ 不可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: false,
    },
    // —— asset.status：HIDDEN/ARCHIVED 仅超管 ——
    {
      name: 'HIDDEN × owner → 不可见（仅超管）',
      input: {
        ...base,
        visibility: 'PUBLIC',
        assetStatus: 'HIDDEN',
        viewerId: owner,
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
        isSuperAdmin: false,
      },
      expected: false,
    },
    // —— 原空间状态门（ns ARCHIVED/FROZEN）随空间删除——PUBLIC 全站可见语义不受影响 ——
    {
      name: 'PUBLIC × 非 owner（原空间归档门已删）→ 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'PUBLIC × 非 owner（原空间状态维度已删）→ 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        viewerId: other,
        isSuperAdmin: false,
      },
      expected: true,
    },
    {
      name: 'PRIVATE × SUPER_ADMIN（原空间归档门已删，超管短路）→ 可见',
      input: {
        ...base,
        visibility: 'PRIVATE',
        viewerId: null,
        isSuperAdmin: true,
      },
      expected: true,
    },
    {
      name: 'PUBLIC × 匿名（原空间只读态已删）→ 可见',
      input: {
        ...base,
        visibility: 'PUBLIC',
        viewerId: null,
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
