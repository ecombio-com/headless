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

## Constitution (read first)
- `.specify/memory/constitution.md` is the ratified rule set (Spec Kit). New features use the Spec Kit flow: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`; feature folders are `specs/NNN-feature/`.
- `specs/mission.md` (why), `specs/tech-stack.md` (how), `specs/roadmap.md` (when). Every spec and change must fit them; changing them is a plan.md §3 re-plan.
- Brand launches follow `docs/brand-launch.md`. Each brand's specification, implementation and validation live in `specs/brands/<brand>/`; update them with every brand change.

## plan.md (required)
- `plan.md` is the source of truth for the launch. Read §0 Rules at the start of every session.
- Every change updates `plan.md`: item status, a line in §7 Update log, and §6 if a decision changed.
- A feature is done (`[x]`) only after it passes the §2 Validation gate; until then it stays `[v]`.
- When a §3 re-planning trigger fires, stop, re-plan in `plan.md`, then continue.
- plan = implementation, `specs/` = specification, `validation/` = test results. Write the spec before code; record a validation run before marking `[x]`. Templates: `specs/_template.md`, `validation/_template.md`.

## Commands
- `pnpm dev` — local server on http://localhost:3000
- `pnpm typecheck`, `pnpm build`
