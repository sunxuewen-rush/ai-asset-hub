// M4b-4 收尾测量（只读）：i18n 键数（按顶层组，缩进解析）+ 双语差集 + 关键文件行数
import { readFileSync } from 'node:fs';
import { en } from '../../../apps/web/src/i18n/en.ts';
import { zh } from '../../../apps/web/src/i18n/zh.ts';

/** 顶层组键数（对象字面量逐组计数；嵌套对象内的键不计入组数——沿 M4b-1 F6 口径） */
const groups = Object.keys(zh) as Array<keyof typeof zh>;
const rows = groups.map((g) => {
  const zhKeys = Object.keys(zh[g]);
  const enKeys = Object.keys(en[g] as object);
  const onlyZh = zhKeys.filter((k) => !enKeys.includes(k));
  const onlyEn = enKeys.filter((k) => !zhKeys.includes(k));
  return { g, zh: zhKeys.length, en: enKeys.length, onlyZh, onlyEn };
});
console.log('【i18n 键数（按顶层组）】');
let totalZh = 0;
let totalEn = 0;
for (const r of rows) {
  totalZh += r.zh;
  totalEn += r.en;
  const flag = r.zh === r.en && r.onlyZh.length === 0 && r.onlyEn.length === 0 ? '✓' : '✗';
  console.log(
    `  ${flag} ${String(r.g).padEnd(12)} zh=${String(r.zh).padStart(3)} en=${String(r.en).padStart(3)}` +
      (r.onlyZh.length ? ` 仅zh:[${r.onlyZh.join(',')}]` : '') +
      (r.onlyEn.length ? ` 仅en:[${r.onlyEn.join(',')}]` : ''),
  );
}
console.log(`  组数 = ${rows.length} · 合计 zh=${totalZh} en=${totalEn}`);
console.log(
  `  assets 组 = zh ${Object.keys(zh.assets).length} / en ${Object.keys(en.assets).length}`,
);
console.log(
  `  errors 组 = zh ${Object.keys(zh.errors).length} / en ${Object.keys(en.errors).length}`,
);

/** 值级泄漏检查：en 字典里出现中日韩字符即报（T11 断言 —— 键集相等不等于值已翻译，F55 教训） */
const CJK = /[\u3400-\u9FFF\u3040-\u30FF]/;
const leaks: string[] = [];
for (const g of groups) {
  for (const [k, v] of Object.entries(en[g] as Record<string, string>)) {
    const raw = String(v);
    if (CJK.test(raw)) leaks.push(`${g}.${k} = ${raw}`);
  }
}
console.log(
  `【en 值级中文泄漏】${leaks.length} 处${leaks.length ? `：${leaks.join(' | ')}` : '（无）'}`,
);

/** 行数（wc -l 等价） */
const files = [
  'apps/web/src/hooks/useViewer.ts',
  'apps/web/src/lib/asset-permissions.ts',
  'apps/web/src/components/console/asset-stats.tsx',
  'apps/web/src/components/console/LabelCard.tsx',
  'apps/web/src/components/console/AssetAdminCard.tsx',
  'apps/web/src/components/market/StarButton.tsx',
  'apps/web/src/api/stars.ts',
  'apps/web/src/pages/AssetDetail.tsx',
  'apps/web/src/pages/Assets.tsx',
  'apps/web/src/pages/Dashboard.tsx',
  'apps/web/src/components/market/detail/VersionCompare.tsx',
  'apps/web/src/components/market/AssetCard.tsx',
  'docs/smoke/scripts/m4b4-seed-assets.ts',
  'docs/smoke/scripts/m4b4-personal-b-dogfood.ts',
];
console.log('【行数（readFileSync 计数，等价 wc -l）】');
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const lines = text === '' ? 0 : text.replace(/\n$/, '').split('\n').length;
  console.log(`  ${String(lines).padStart(4)}  ${f}`);
}
