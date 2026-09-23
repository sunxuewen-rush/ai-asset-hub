/**
 * 审计动作全集的反漂移测试（M4b-6 T2）。
 *
 * ① **源码扫描**：`src/**` 里所有 `action: '<字面量>'` 必须已登记进 `AUDIT_ACTION_GROUPS`；
 * ② **常量覆盖**：`AUDIT_ACTIONS.*` 的每个取值也必须已登记（常量写法不产生字面量 ⇒ 单独核）；
 * ③ **形态**：分组 = 点号前缀且组内动作同前缀；无重复动作。
 *
 * 意义：新增写入点若忘记登记目录 ⇒ 本文件红（`/api/audit/actions` 的下拉就不会漏项）。
 */
import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIT_ACTION_GROUPS, allAuditActions } from './actions.js';
import { AUDIT_ACTIONS } from './audit.js';

const SRC_ROOT = new URL('..', import.meta.url).pathname;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsFiles(p));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

describe('T2 · 审计动作目录', () => {
  it('源码里出现的动作字面量全部已登记（防漏登记）', () => {
    const known = new Set(allAuditActions());
    const found = new Set<string>();
    for (const file of tsFiles(SRC_ROOT)) {
      const text = readFileSync(file, 'utf-8');
      for (const m of text.matchAll(/action: '([a-z_]+\.[a-z_.]+)'/g)) found.add(m[1]!);
    }
    const missing = [...found].filter((a) => !known.has(a));
    expect(missing).toEqual([]);
    // 反向：目录里不能有「代码根本不写」的幽灵项（常量写法不产生字面量 ⇒ 用 AUDIT_ACTIONS 取值放行）
    const constValues = new Set<string>(Object.values(AUDIT_ACTIONS));
    const orphans = allAuditActions().filter((a) => !found.has(a) && !constValues.has(a));
    expect(orphans).toEqual([]);
  });

  it('AUDIT_ACTIONS 常量取值全部已登记', () => {
    const known = new Set(allAuditActions());
    const missing = Object.values(AUDIT_ACTIONS).filter((a) => !known.has(a));
    expect(missing).toEqual([]);
  });

  it('形态：分组 = 点号前缀 · 组内同前缀 · 无重复', () => {
    const seen = new Set<string>();
    for (const g of AUDIT_ACTION_GROUPS) {
      expect(g.actions.length).toBeGreaterThan(0);
      for (const a of g.actions) {
        expect(a.startsWith(`${g.prefix}.`)).toBe(true);
        expect(seen.has(a)).toBe(false);
        seen.add(a);
      }
    }
    expect(seen.size).toBe(allAuditActions().length);
  });
});
