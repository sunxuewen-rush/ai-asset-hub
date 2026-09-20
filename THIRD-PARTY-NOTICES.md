# Third-Party Notices

AI Asset Hub is licensed under the Apache License 2.0 (see [LICENSE](./LICENSE)).
This file lists third-party software **included in** or **distributed with** this repository,
as required by their respective licenses. Everything below was measured from the actual
installed dependency tree (2026-09-20), not transcribed by hand.

## 1. Code vendored into this repository

| Component | How it got here | License |
|-----------|-----------------|---------|
| shadcn/ui | UI primitives generated with the shadcn CLI and committed to `apps/web/src/components/ui/shadcn/` (33 components) | MIT |

## 2. Direct runtime dependencies

### `@ai-asset-hub/server`
| Package | Version | License |
|---------|---------|---------|
| `@ai-asset-hub/protocol` |  | see package |
| `@better-auth/api-key` | 1.7.5 | MIT |
| `@hono/node-server` | 1.19.17 | MIT |
| `better-auth` | 1.7.5 | MIT |
| `dotenv` | 17.4.2 | BSD-2-Clause |
| `drizzle-orm` | 0.45.2 | Apache-2.0 |
| `hono` | 4.13.7 | MIT |
| `js-yaml` | 5.4.1 | MIT |
| `ldapjs` | 3.0.7 | MIT |
| `openid-client` | 6.8.8 | MIT |
| `pg` | 8.23.0 | MIT |
| `yauzl` | 3.4.0 | MIT |
| `zod` | 3.25.76 | MIT |

### `@ai-asset-hub/web`
| Package | Version | License |
|---------|---------|---------|
| `@tanstack/react-table` | 9.2.4 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `cmdk` | 1.1.1 | MIT |
| `cn` | 0.2.6 | MIT |
| `date-fns` | 4.4.0 | MIT |
| `lucide-react` | 1.44.0 | ISC |
| `next-themes` | 0.4.6 | MIT |
| `radix-ui` | 1.6.7 | MIT |
| `react` | 19.2.8 | MIT |
| `react-day-picker` | 10.0.1 | MIT |
| `react-dom` | 19.2.8 | MIT |
| `react-markdown` | 10.1.0 | MIT |
| `react-router-dom` | 7.18.3 | MIT |
| `remark-gfm` | 4.0.1 | MIT |
| `sonner` | 2.0.8 | MIT |

### `@ai-asset-hub/protocol`
| Package | Version | License |
|---------|---------|---------|
| `zod` | 3.25.76 | MIT |

## 3. Transitive dependencies

The complete tree (including transitive dependencies) is pinned in [`bun.lock`](./bun.lock).
License distribution measured across the 404 installed packages:

| License | Packages |
|---------|----------|
| MIT | 372 |
| ISC | 13 |
| Apache-2.0 | 8 |
| MPL-2.0 | 2 |
| BSD-3-Clause | 2 |
| MIT OR Apache-2.0 | 2 |
| 0BSD | 1 |
| BSD-2-Clause | 1 |
| CC-BY-4.0 | 1 |
| Python-2.0 | 1 |

**No GPL, AGPL, SSPL, FSL or BUSL licensed packages are present in the tree.**

## 4. Licenses that carry additional requirements

- **MPL-2.0** (weak, file-level copyleft) — `lightningcss@1.32.0`, `lightningcss-darwin-arm64@1.32.0`.
  We do not modify their source files; the original files and notices are retained as published.
- **CC-BY-4.0** (attribution required) — `caniuse-lite@1.0.30001810`, © caniuse contributors (https://caniuse.com).
- **Python-2.0** — `argparse@2.0.1`, © Python Software Foundation.
- **0BSD** — `tslib@2.8.1`, © Microsoft Corporation.
- `precond@0.2.3` declares no `license` field in its `package.json`; its upstream repository
  (`MathieuTurcotte/node-precond`) carries an MIT license text, and it is treated as MIT accordingly.

## 5. Design references (no source code copied)

The architecture was informed by the projects listed in the README's 致谢 section.
**No source code from those projects was copied into this repository.**
