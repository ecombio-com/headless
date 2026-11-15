<!--
Sync Impact Report
- Version: none → 1.0.0 (first ratification)
- Source of truth for detail: specs/mission.md (why), specs/tech-stack.md (how), specs/roadmap.md (order of work)
- Templates checked: plan-template.md (Constitution Check uses the principles below), spec-template.md, tasks-template.md: no changes needed
-->
# Headless Storefront Constitution

The rules every spec, plan, task and code change in this repo must follow. Detail lives in `specs/mission.md`, `specs/tech-stack.md` and `specs/roadmap.md`; brand proof lives in `specs/brands/<brand>/`.

## Core Principles

### I. One Codebase, Brands by Settings (NON-NEGOTIABLE)
One repo (`ecombio-com/headless`), one `main` branch. Brands (bicyclebio.com, skaterbio.com, scooterbio.com) differ only by settings: `.env.<brand>`, an env block in `wrangler.jsonc`, and the brand registry in `src/brands/` and `src/core/config/`. Never a branch, fork or copied folder per brand. ecombio.com is out of scope (it stays on Hydrogen).

### II. Shopify Is the System of Record
Products, prices, inventory, orders and customers live in the live store (khkkyb-b8). The storefront reads them and never keeps its own copy as the truth. Paid orders are created in Shopify, tagged `storefront=<brand>`.

### III. Every Brand Stands Alone at Runtime
Each brand has its own Shopify Headless storefront, its own Cloudflare Worker (`headless-<brand>`), its own GitHub Environment and its own Stripe webhook. One brand failing never takes another down. Shared only where it saves work: repo, Shopify store, Stripe account, Cloudflare account, ECOMBIOv2 app.

### IV. Secrets Never Touch Git or Chat
`.env.<brand>` holds public values only. Secrets go to Worker secrets through `scripts/` with masked input. No key, token or signing secret is ever printed, committed, or pasted into any chat or AI assistant.

### V. Deploy Only Through GitHub, Only When Ready
A push to `main` deploys every brand. Push only work that passed the gate (Principle VI). No local `pnpm run deploy` (it packs `.env.local` into the Worker). Unfinished work stays uncommitted.

### VI. Spec → Plan → Tasks → Build → Validate (NON-NEGOTIABLE)
No feature starts without a spec and is done without proof. A feature is done only when every acceptance criterion passes and a validation record exists. A failed check keeps it open; two fails trigger a re-plan in `plan.md`.

### VII. Scripts and CLIs First
Repeatable work runs as commands or scripts in PowerShell (`cf`, `wrangler`, `gh`, `stripe`, `specify`, `scripts/*.ps1`): read-only check first, confirm before anything is deleted. Dashboards and AI assistants only where no command exists.

### VIII. Fail Closed, Ask Before Live Writes
Switches such as `STRIPE_CHECKOUT_ENABLED` turn on only when every key exists; otherwise the safe path runs. Reading is free; any write to the live Shopify store or a live domain's DNS waits for the owner's explicit yes.

### IX. Plain Language
Docs, UI copy and commit messages use short sentences and plain words, one idea at a time, with the key point first.

## Stack and Platform Constraints
- Next.js 16 (App Router) + React 19 + Tailwind 4, deployed with OpenNext to Cloudflare Workers.
- Shopify Storefront API for reading; Admin API (ECOMBIOv2) only for creating orders.
- Checkout: cart → address → payment with Stripe; Shopify hosted checkout stays available behind the switch.
- Search on product listing pages: Shopify search + Search & Discovery now; Algolia later.
- `src/core/` imports no `next/*` or `react`. New code never imports `src/compat/`. Interactive components only get `'use client'`.
- Pin versions that touch payments or Shopify APIs; adding or swapping a tool is a re-plan.

## Development Workflow
1. New feature: `/speckit-specify` → `specs/NNN-feature/spec.md`. Use `/speckit-clarify` when anything is unclear.
2. `/speckit-plan` (passes the Constitution Check below) → `/speckit-tasks` → `/speckit-analyze` before building.
3. `/speckit-implement`, then the gate: `pnpm typecheck`, `pnpm build`, the feature's acceptance criteria, and for brand work `scripts/check-brand.ps1` with 0 failed.
4. Record proof: `validation/<ID>-<slug>.md`, or `specs/brands/<brand>/validation.md` for brand work.
5. Update `plan.md` (status, §7 log; §6 when a decision changes). Then commit; push only finished batches.
- Brand launches follow `docs/brand-launch.md` and keep `specs/brands/<brand>/` (specification, implementation, validation) current.
- Order of work follows `specs/roadmap.md`.

## Governance
- This constitution outranks every other practice in the repo. `specs/mission.md`, `specs/tech-stack.md` and `specs/roadmap.md` hold the detail and must agree with it.
- Every plan's Constitution Check lists Principles I–IX; a violation needs a written reason in the plan or the plan changes.
- Amending: record the trigger and decision in `plan.md` §6, update this file and the affected `specs/` files in the same change, and bump the version (MAJOR: a principle removed or redefined; MINOR: a principle or section added; PATCH: wording).

**Version**: 1.0.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-14
