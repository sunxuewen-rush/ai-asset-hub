import { describe, expect, test } from 'bun:test';
import { getScanner } from './registry.js';

/** M3 扫描器契约（design §3.2 R3：直通恒过、空 findings、单例） */
describe('governance scanner', () => {
  test('直通实现恒 ok 且 findings 为空数组（任意输入）', async () => {
    const scanner = getScanner();
    const result = await scanner.scan({
      type: 'skill',
      manifestJson: { name: 'demo' },
      files: [{ path: 'SKILL.md', size: 128 }],
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  test('输入类型全族可扫（type 差异化留给真规则——契约不拒）', async () => {
    const scanner = getScanner();
    for (const type of ['skill', 'mcp', 'agent'] as const) {
      const result = await scanner.scan({
        type,
        manifestJson: type === 'mcp' ? { servers: [] } : { name: 'x' },
        files: [{ path: type === 'skill' ? 'SKILL.md' : type === 'mcp' ? 'mcp.json' : 'agent.md', size: 64 }],
      });
      expect(result.ok).toBe(true);
    }
  });

  test('getScanner 惰性单例（替换实现点唯一——registry 收敛）', () => {
    expect(getScanner()).toBe(getScanner());
  });
});
