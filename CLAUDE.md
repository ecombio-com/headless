# ecombio headless storefront (Next.js)

Next.js 16 App Router, React 19, Tailwind 4, pnpm. Ported from the Hydrogen repo; see MIGRATION.md.

## Rules
- `src/core/` must not import `next/*` or `react`. Shopify logic goes here.
- New pages follow `src/features/<area>/` + `definePage` (see MIGRATION.md, "A native page").
- Pages still in `src/routes/` are generated: change `src/routes/<name>/`, then run `python scripts/gen-app.py`. Native pages in `src/app/` are hand-written.
- New code: don't import from `src/compat/`. Use `next/link`, `next/navigation`, `@shopify/hydrogen-react`, `~/core`, `<Deferred>` for streamed data, Server Actions for mutations.
- Interactive components need `'use client'` at the top; everything else stays a Server Component.
- Run `pnpm typecheck` and `pnpm build` before pushing. Don't push after every small change.
- Terminal: Windows PowerShell.

## Commands
- `pnpm dev` — local server on http://localhost:3000
- `pnpm typecheck`, `pnpm build`
