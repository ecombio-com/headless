# Mission

> Part of the project "constitution" (`specs/`). Formal Spec Kit governance lives separately in `.specify/memory/constitution.md`; keep the two consistent.

## Goal

goal = "One shared headless storefront codebase that serves BicycleBio, ScooterBio and SkaterBio as separate, fast, brand-specific shops on Shopify, with customer sign-in and Stripe checkout, deployed as one Cloudflare Worker per brand."

## Plan

### How and why
- **How:** a single Next.js app, deployed through OpenNext to Cloudflare Workers, one Worker per brand. Shopify stays the system of record (catalog, customers, orders). Brand differences come from per-brand env files, `src/brands/registry.ts` and `src/core/config/*`, not from forked code.
- **Why:** one codebase avoids triple maintenance, per-brand Workers isolate failures and secrets, and a headless front end gives control over speed, SEO and the product-page experience that a theme does not.

### Features and capabilities
- Brand-aware storefront: home, collections, product pages (PDP), cart, blog/journal, policies, sitemaps, robots.
- Product page extras: option and step pickers, recap, reassurance bar, FAQs, technical specs, cross-sell, related articles.
- Search (Algolia) and reviews (Yotpo); analytics (GA4, consent banner); Klaviyo newsletter.
- Customer sign-in with Better Auth (email + password) on a per-brand D1 database, on `auth.<brand>.com`.
- Checkout through Stripe (currently test mode) and Shopify checkout-kit.
- Locale handling and ZIP-based delivery estimates.

### Benefits and opportunities
- One fix or feature ships to all three brands.
- Edge deployment on Cloudflare keeps pages fast and cheap to run.
- Per-brand secrets and databases limit blast radius.
- Adding a fourth brand is mostly config plus a launch checklist (`docs/brand-launch.md`).
- Opportunity: brand-specific merchandising and content experiments without touching Shopify themes.

### Usages and benefits
| Who | Uses | Benefit |
|---|---|---|
| Shoppers | Browse, search, buy, sign in, view orders | Fast, consistent shopping per brand |
| Merchandisers | Shopify admin, metafields drive PDP content | No code change for content updates |
| Developers | Spec Kit workflow, one repo, scripted brand setup | Predictable, reviewable changes |
| Operations | Per-brand Workers, D1, secrets scripts | Isolated deploys and rollbacks |

### Minimum requirements
- Shopify store(s) with the Storefront API and Customer Account API enabled.
- Cloudflare account with Workers and D1 (one D1 database per brand).
- Stripe account (test mode is enough for development).
- Node.js and pnpm (the Next.js 16 minimum Node version: **verify**), Wrangler 4.
- Per-brand env files (`.env.<brand>`, untracked) and secrets set through the `scripts/set-*-secrets.ps1` scripts.

### Recommended requirements
- Cloudflare Workers paid plan (bundle size and limits for OpenNext: **verify**).
- Staging Worker per brand before production.
- CI running `tsc --noEmit` and the brand checks on every PR.
- Stripe live-mode readiness checklist and webhook monitoring before launch.
- Algolia, Yotpo and Klaviyo accounts per brand, with search-only and public keys in env and everything else in secrets.

## Non-goals (for now)
- Replacing Shopify as system of record.
- Social or OTP sign-in (removed; email + password only).
- Self-serve account creation policy is **undecided** (see roadmap Phase 1).
