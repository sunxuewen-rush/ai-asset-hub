/**
 * `refractor@3.x` 局部类型声明（**正式仓内件** —— M4b-5 diff 面）。
 *
 * 为什么需要：`refractor@3` **不自带类型声明**（包内仅 `index.js` / `core.js` / `lang/`），
 * 而 `react-diff-view` 的 `tokenize(hunks, { highlight, refractor, language })` 需要它的
 * `highlight(language, value)` 签名。
 *
 * 为什么不用 `@types/*`：遵守「**不新增依赖**」——本批只引入 `react-diff-view` + `refractor` 两件，
 * 类型面用局部声明覆盖（签名按 refractor 3.x 实现）。
 *
 * ⚠️ `refractor` **必须 3.x**：`react-diff-view` README 明确不兼容 4.x（Prism 9 迁移）。
 *
 * 用法（**按需注册 21 语言** —— 整包 `import 'refractor'` 会拉进 277 种，gzip 由 ≈33KB 涨到 213KB）：
 * ```ts
 * import refractor from 'refractor/core.js';
 * import markdown from 'refractor/lang/markdown.js';
 * refractor.register(markdown);
 * ```
 */
declare module 'refractor' {
  /** 高亮：返回 hast 根节点（`react-diff-view` 只消费其结构） */
  export function highlight(language: string, value: string, options?: unknown): unknown;
  const refractor: { highlight: typeof highlight };
  export default refractor;
}

declare module 'refractor/core.js' {
  interface Refractor {
    /** 高亮：返回 hast 根节点 */
    highlight(language: string, value: string, options?: unknown): unknown;
    /** 注册语言（语法模块来自 `refractor/lang/<name>.js`） */
    register(grammar: unknown): void;
    /** 已注册语言名 */
    registered?(language: string): boolean;
  }
  const refractor: Refractor;
  export default refractor;
}

/** 语言模块（`refractor/lang/<name>.js`）—— 通配声明，避免逐个文件枚举 21 条 */
declare module 'refractor/lang/*.js' {
  const grammar: unknown;
  export default grammar;
}
