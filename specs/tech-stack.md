# Tech stack

Part of the Headless constitution. Read `mission.md` first.
Facts below were read from the repo on 2026-11-14 (commit `f54a9a8` + local changes).

## 1. The stack at a glance

| Layer | Tool | Version | One per brand? |
| --- | --- | --- | --- |
| Commerce backend | Shopify, live store khkkyb-b8 (ecombio-store) | Storefront API, Admin API | Headless-channel storefront + tokens: **yes**. Store: shared |
| Framework | Next.js (App Router) + React | 16.4.6 / 19.3.1 | Shared code |
| Styling | Tailwind CSS + design tokens (`src/styles/tokens.css`) | 4.x | Shared; per-brand tokens via `data-brand` |
| UI parts | Base UI, lucide-react, sonner | 1.8 / 1.47 / 2.0 | Shared |
| Shopify UI helpers | `@shopify/hydrogen-react` | 2026.4.4 | Shared |
| Host | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`) | 1.20.x, wrangler 4.161 | Worker `headless-<brand>`: **yes** |
| DNS + TLS + security | Cloudflare zones | Free plan | Zone `<brand>.com`: **yes** |
| Code + deploys | GitHub `ecombio-com/headless`, GitHub Actions | Node 22, pnpm 12 | Environment `<brand>`: **yes**. Repo: shared |
| Payments | Stripe (Payment Element, `@stripe/stripe-js`) | 10.x | Webhook endpoint: **yes**. Account + keys: shared |
| Order creation | ECOMBIOv2 Shopify app (client credentials → Admin `orderCreate`) | — | Shared |
| Reviews | Yotpo | — | Shared |
| Search (PLP) | Shopify Storefront search + Search & Discovery (filters, synonyms, boosts) now; Algolia later (built, `ALGOLIA_ENABLED=false`) once its index holds live-store products per brand | — | Shared; results scoped per brand |
| Analytics | GA4 (with consent banner) | — | Shared |
| Validation | zod | 4.x | Shared |
| Ops CLIs | `cf` (Cloudflare API: DNS, zones, rules, email), `wrangler` (Workers, secrets, logs), `gh`, `stripe` | cf 1.0 beta | Shared |
| Spec-Driven Development | GitHub Spec Kit (`specify` CLI, `.specify/`, `/speckit-*` skills in `.claude/skills/`) | 1.4.0 | Shared |

## 2. How a request flows

```
Shopper → Cloudflare (DNS, TLS, security rules) → Worker headless-<brand>
        → Next.js page (Server Component) → Shopify Storefront API (+ Yotpo)
        → HTML streamed back
Checkout: /cart → /address → /payment (Stripe Payment Element) → /payment/complete
        → Admin orderCreate on khkkyb-b8 (paid order, tagged storefront=<brand>)
        → Stripe webhook /api/stripe/webhook = backup that creates the order if the shopper never returns
```

## 3. How the brand is chosen

- Each Worker is built from `.env.<brand>` (copied to `.env.production.local` in CI) and has `BRAND=<brand>`.
- `src/core/config/storefronts.ts` → `getStorefrontConfig()` reads `BRAND` first, then falls back to the old Hydrogen storefront ID, then to ecombio.
- The config gives: name, menus (`<brand>-main`, `<brand>-footer`), home collection (`<brand>-all`).
- `src/brands/layouts.ts` picks the header and footer per brand. Scooter and Skater reuse BicycleBio's for now.
- Handles prefixed with another brand (`scooterbio-…`) return 404 on this brand (`isOtherBrandHandle`).

Setting precedence at runtime: **Worker secrets/vars > `.env.<brand>`** (OpenNext fills only what's missing).

## 4. Repo layout

| Folder | What it holds | Rule |
| --- | --- | --- |
| `src/core/` | Shopify client, cart, storefront + brand config, locales | No `next/*` or `react` imports |
| `src/server/` | Next.js glue: request context, session, Customer Account login, route runner | Server only |
| `src/app/` | Next.js routes (25 page files: native pages + generated wrappers) | Native pages hand-written; generated ones via `scripts/gen-app.py` |
| `src/features/` | Native page logic (product, collection, blog, pages) | New pages go here with `definePage` |
| `src/routes/` | 35 routes ported from Hydrogen (`server.ts` + `view.tsx`) | Being retired, one area at a time |
| `src/compat/` | Stand-ins for `react-router` / `@shopify/hydrogen` (79 files still import it) | New code never imports it |
| `src/components/`, `src/lib/` | UI and helpers | `'use client'` only where interactive |
| `src/@yotpo/`, `src/@algolia/` | Integrations, each with its own config + client | Fail safely when the service is down |
| `src/brands/` | Per-brand layouts and registry | Brand differences live here, not in branches |
| `scripts/` | `check-brand.ps1`, `set-brand-env.ps1`, `set-brand-secrets.ps1`, `cf-zone.ps1` (add, list, free, harden), `cf-email.ps1` (parked) | Read-only checks first; secrets masked; confirm before deletes |
| `docs/` | `brand-launch.md` (the 9-step brand workflow) | — |
| `specs/`, `validation/`, `plan.md` | Constitution, specs, test records, implementation plan | spec → build → validate → plan |
| `specs/brands/<brand>/` | One brand feature: specification, implementation, validation | Updated with every brand change |

Size: about 400 source files, 33,000 lines.

## 5. Why this is the right composition

| Choice | Why it fits the mission | Trade-off we accept |
| --- | --- | --- |
| **Headless Shopify** (not a Liquid theme) | Own UI per brand, own checkout flow, while Shopify keeps catalog, orders, inventory and tax | We maintain the storefront code; theme-only apps (Klaviyo embed, Swell, Usercentrics) don't load |
| **One Shopify store, one Headless storefront per brand** | One admin, one catalog, one order list; each brand still has its own keys and channel | Brand scoping depends on tags, collections and handle prefixes being kept clean |
| **Next.js App Router** | Server Components keep pages fast and SEO-friendly; largest ecosystem; we already had a Next.js base (Vercel Shop) | Needs an adapter (OpenNext) to run on Workers |
| **Cloudflare Workers** (not Oxygen, not Vercel) | DNS for the brands already lives on Cloudflare; custom domains get TLS automatically; one Worker per brand isolates failures; low cost; runs at the edge | Free plan caps subrequests per request (Yotpo warning); caching must be set up (checklist C1) |
| **One repo, GitHub Environments per brand** | Fix once, ship to every brand; per-brand deploy history; no branch drift | One push deploys all brands, so `main` must stay green |
| **Stripe for payment, Shopify for the order** | Payment form inside our own page (no popup), Stripe Link and wallets; the order still lands in Shopify as Paid | Two systems to reconcile (refunds, disputes); `STRIPE_CHECKOUT_ENABLED` switches back to Shopify's hosted checkout |
| **Scripts + CLIs** (`cf`, `wrangler`, `gh`, `stripe`) | Repeatable, terminal-only, masked secrets; a brand launch is copy-paste; no AI assistant in the loop | Dashboard-only steps left: creating a Shopify Headless storefront, Shopify domain settings |

## 6. Known gaps (owned by `checklist.md` and `plan.md`)

- No persistent cache yet (OpenNext incremental cache not configured) → Yotpo "Too many subrequests".
- Compat layer still in use; generated routes still exist.
- No error pages, no security headers, no automated tests.
- Customer sign-in URLs not yet added per brand domain.
- Stripe in test mode; live keys and key rotation at public launch.

## 7. Rules for changing the stack

- Adding or swapping a tool is a §3 re-planning trigger in `plan.md`: write the decision in `plan.md` §6 and update this file in the same change.
- Pin versions that touch payments or Shopify APIs; upgrade on purpose, not by accident.
