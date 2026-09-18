# `ui/shadcn/` — vendored shadcn/ui components

These 33 components were generated with the **shadcn/ui** CLI and committed into this repository
(MIT licensed — upstream: https://ui.shadcn.com). They are the base primitives of our UI layer
and **may be modified freely** — shadcn's design intent is that the components belong to the consumer.

- **Provenance**: initially character-for-character equivalent to the official `new-york-v4` registry
  entries; later adjustments are made on the **consuming side** wherever possible, so the vendored
  files stay close to upstream.
- **Adding a component**: `bunx shadcn@latest add <name>` — make sure it lands under
  `apps/web/src/components/ui/shadcn/`.
- **License**: see [THIRD-PARTY-NOTICES.md](../../../../THIRD-PARTY-NOTICES.md).
