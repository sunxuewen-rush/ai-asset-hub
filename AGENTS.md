# AI Asset Hub — Agent Guide

<p align="center">
  <b>English</b> | <a href="AGENTS_zh.md">简体中文</a>
</p>

AI Asset Hub is an open-source, self-hostable registry & marketplace for AI assets —
skills, MCP servers, and agent definitions — with open-collaboration review governance.

This file tells agents how to work in this repository. Humans should read
`CONTRIBUTING.md` (pending M6).

## Repository Layout

```
docs/                  Design & protocol documents (see §Docs below)
packages/protocol      Zod schemas for asset protocols (single source of truth, pending M1)
apps/                  server / web / cli (pending M1)
README.md · LICENSE    Apache 2.0
```

## Docs

Follow the three-layer doc architecture defined in `docs/00-product-direction.md` §7:

- **Spec layer** `docs/NN-*.md` — what the system is (stable across milestones):
  `00` direction & decisions · `01` asset protocol umbrella · `02-04` family protocols
  (skill/mcp/agent) · `05` identity & access · `06` label system
- **Design layer** `docs/YYYY-MM-DD-<topic>-design.md` — why decisions were made
  (8-section skeleton; milestone design blocks only)
- **Plan layer** `docs/plans/<milestone>-<topic>.md` — implementation task checklists
  with acceptance assertions
- **Tracker** — milestone status table in `00` §5 (exit criteria: design ≥9 self-score +
  plan tasks green + code verified)

Reference chain is one-way: plan → design → spec §N. Reference, don't copy.

## Commands

_Pending M1 (project skeleton): `pnpm install / typecheck / test / lint / build`
will be filled in once the monorepo exists. Do not invent commands before then._

## Conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`)
- Verify before commit: typecheck + full test suite green. Tests are upstream
  contracts — never weaken a test to make a local hack pass.
- Protocol changes go through `packages/protocol` zod schemas first (docs/01 §6),
  then both ends (server + web) consume the updated types.
- Docs finalization gate: 8-dimension self-score ≥9 (docs/00 §7) before implementation.
- Clean Room: architecture may be referenced from other projects, but code must be
  original — never copy FSL-licensed source (e.g. Den `ee/`) into this repo.
- Neutral & open: docs must not reference any internal/company system or bind to a
  specific client (docs/00 §4).
- Neutrality rule: when implementing a protocol field, consult the family protocol doc
  (02/03/04) — it is the contract.

## Operating Limits

- No destructive commands or database mutation unless explicitly requested.
- Never expose secrets, tokens, or connection strings.
- When in doubt about a design decision, stop and ask — do not guess and implement.

## Milestones

See `docs/00` §5 for M0-M6 tracker and exit criteria. Current: M0 done, docs 00-06
finalized; next: M1 platform skeleton.
