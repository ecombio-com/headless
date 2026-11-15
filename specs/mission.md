# Mission

Part of the Headless constitution: `mission.md` (why), `tech-stack.md` (how), `roadmap.md` (when).
Every spec, plan item and code change must fit these three files. Each brand is a feature in `specs/brands/<brand>/` (specification, implementation, validation). If one doesn't, change the constitution first, on purpose.

## 1. Mission

> "Run a family of brand stores (bicyclebio.com, scooterbio.com, skaterbio.com) from one codebase and one Shopify store, each with its own look and domain, each able to take payment and create real orders."

## 2. Why this exists

- **Brands win searches that a general store can't.** A shopper looking for a kick scooter trusts scooterbio.com more than a store that sells everything. ecombio.com stays the general-purpose store; the brand sites go deep on one product type each.
- **One team can't run four separate codebases.** One codebase means a fix or a feature reaches every brand at once.
- **We want to own the buying experience.** Our own pages, our own checkout flow (Back Market style: cart → address → payment), and over time our own data, while Shopify keeps doing what it does best (catalog, orders, inventory, tax).

## 3. Who it serves

| Who | What they need |
| --- | --- |
| Shoppers | A fast, clear store for one product type; an easy checkout; trust (warranty, returns, real reviews) |
| The owner (ecombio) | One place to change things; every brand live from one push; orders in one Shopify admin |
| Claude sessions | One source of truth: this constitution, `plan.md`, `specs/`, `validation/`, `docs/` |

## 4. The brand family

| Brand | Domain | Sells | Status |
| --- | --- | --- | --- |
| BicycleBio | bicyclebio.com | Electric bikes and bikes | Live (Stripe test mode), 2026-11-14 · `specs/brands/bicyclebio/` |
| SkaterBio | skaterbio.com | Electric skateboards and skateboards | Live (Stripe test mode), 2026-11-14 · `specs/brands/skaterbio/` |
| ScooterBio | scooterbio.com | Electric scooters and kick scooters | In progress: Shopify still holds www and the root · `specs/brands/scooterbio/` |
| ecombio | ecombio.com | Everything (general-purpose parent) | Stays on Hydrogen/Oxygen; not served by this repo today |

## 5. Principles (non-negotiable)

1. **One codebase, one `main` branch.** Brands differ by settings, never by branch: `.env.<brand>`, a block in `wrangler.jsonc`, and the brand registry in code.
2. **Shopify is the system of record.** Products, prices, inventory, orders and customers live in the live store (khkkyb-b8). The storefront reads them; it never keeps its own copy as the truth.
3. **Every brand stands alone at runtime.** Own Shopify Headless storefront, own Cloudflare Worker, own Stripe webhook. One brand failing never takes down another.
4. **Shared where it saves work.** One repo, one Shopify store, one Stripe account, one Cloudflare account, one admin app (ECOMBIOv2).
5. **Secrets never touch git or chat.** `.env.<brand>` holds public values only. Secrets go to Worker secrets through the scripts, typed masked.
6. **Deploy only through GitHub.** Push to `main`, GitHub Actions builds and deploys each brand. No local deploys.
7. **Fail closed.** Payment switches (`STRIPE_CHECKOUT_ENABLED`) turn on only when every key is present; otherwise the safe path runs.
8. **Spec → build → validate → plan.** No feature is done until it passes `plan.md` §2 and has a record in `validation/`.
9. **Live-store writes need a yes.** Reading is free; writing to the live store waits for the owner's explicit approval.
10. **Plain language.** Docs, copy and commit messages use short sentences and plain words.

## 6. What success looks like

- All three brand domains serve their own store, pass `scripts/check-brand.ps1` with 0 failures, and complete a test order that lands in Shopify.
- A new brand goes live in about 30 minutes by following `docs/brand-launch.md`.
- Live payments on, keys rotated, and two clean weeks of logs (see `roadmap.md`).

## 7. Out of scope (for now)

- Serving ecombio.com from this repo (confirmed 2026-11-14: brand family only; ecombio.com stays on Hydrogen).
- Leaving Shopify for catalog or orders.
- A separate database of our own (customers, analytics). Revisit after launch.

## 8. Benefits and opportunities

- One fix or feature reaches every brand at once; one team runs one codebase.
- Brand sites rank for their own product type, which a general store can't match.
- We own the buying experience (cart → address → payment) while Shopify keeps catalog, orders, inventory and tax.
- A new brand goes live in about 30 minutes (`docs/brand-launch.md`); each brand fails alone.
- Opportunity: own data and analytics after launch (see §7, out of scope for now).

## 9. Usages and benefits

| Who | Uses | Benefit |
| --- | --- | --- |
| Shoppers | Browse, search, check out, sign in, see orders | Fast, focused store for one product type |
| The owner (ecombio) | One repo, one Shopify admin, brand scripts | Every brand live from one push; orders in one place |
| Claude sessions | Constitution, `plan.md`, `specs/`, `validation/` | One source of truth |

## 10. Requirements

**Minimum**
- Shopify live store (khkkyb-b8) with a Headless storefront and tokens per brand.
- Cloudflare account: zone per brand, Worker `headless-<brand>`, D1 database per brand for sign-in.
- Stripe account (test mode for development) and the ECOMBIOv2 Shopify app for order creation.
- GitHub repo with Actions and an Environment per brand; Node 22, pnpm.
- `.env.<brand>` (public values) in the repo; secrets set through `scripts/set-*-secrets.ps1`.

**Recommended**
- Cloudflare Workers Paid plan with a persistent cache (roadmap phase 15).
- Stripe live keys rotated, live webhooks per brand (phase 21).
- `check-brand.ps1` passing with 0 failures before any launch; two clean weeks of logs after (phase 22).
- Error pages, security headers and automated tests (phase 19).
