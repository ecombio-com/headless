# checklist.md — Headless gap and pitfall audit

Audit date: 2026-11-14. Sources: the Headless code, the Hydrogen repo (commits up to 4f210ca),
and `metafield-compare` run 20261114-063526 (dev = ecombio, prod = khkkyb-b8).

**Severity:** P0 = wrong results today · P1 = must be fixed before launch (M3) · P2 = after launch
**Status:** `[ ]` open · `[x]` fixed and validated
**Plan:** the task in plan.md that owns the fix ("NEW" = added to plan.md by this audit)

Every item was seen in code or data today unless it says **Check**.

---

## A. Environments and stores

- [ ] **A1 · P0 · The production Worker points to the dev store.** `.env.production` has `PUBLIC_STORE_DOMAIN` and `PUBLIC_CHECKOUT_DOMAIN` = `ecombio.myshopify.com`. The PDP data (32 products) lives on khkkyb-b8, so Headless shows none of it. Fix: switch every prod store value (domain, storefront ID and token, shop ID, customer-account client, checkout domain) to khkkyb-b8. · Plan: P1.2
- [ ] **A2 · P0 · The dev store is far behind prod.** Dev has 10 metafield definitions; prod has 86. No PDP definitions (`custom.*` or `pdp.*`) and no product values exist on dev, so "dev first" can't work for the PDP. Fix: copy definitions plus 2–3 sample products from prod to dev. · Plan: NEW P1.6
- [ ] **A3 · P1 · The dev admin app can't read products.** The compare script got "Access denied for products field" on dev. Fix: add `read_products` and `read_metaobjects` scopes to the dev app. · Plan: P1.6
- [ ] **A4 · P1 · `.env.production` is tracked in git.** Today it holds only public values (storefront token, `pk_test`, Algolia search key, Yotpo app key). Pitfall: a secret added later goes to GitHub. Fix: a header comment saying public values only; secrets go only in Worker secrets. · Plan: P1.2
- [ ] **A5 · P1 · Checkout settings are placeholders.** `CHECKOUT_STOREFRONTS=brand-a,brand-b` and `CHECKOUT_ALLOWED_ORIGINS=http://localhost:3000` in production, so checkout API calls from ecombio.com or workers.dev get blocked. · Plan: P2.4
- [ ] **A6 · P1 · The locale setting conflicts with the code.** The env says `en-US,es-US`, but `src/core/config/i18n.ts:48` hard-codes `['en-us']`. Decide: en-us only at launch, redirect `/es-us`. · Plan: P5.2
- [ ] **A7 · P1 · There's one Worker and no dev environment.** `wrangler.jsonc` has no `env` blocks, and `keep_vars: true` lets dashboard values silently override the file. · Plan: P1.2
- [ ] **A8 · P2 · The Stripe key is test-mode in prod.** That's fine while `STRIPE_CHECKOUT_ENABLED=false`. Flip both together. · Plan: P2.4

## B. Shopify data (PDP and metafields)

- [ ] **B1 · P0 · Headless reads the old `custom.*` PDP fields.** Hydrogen switched to `pdp.*` on Nov 14 (commit bd78461). Prod values: `pdp.specs` 32, `pdp.faq` 32, `pdp.steps` 32, `pdp.resources` 10, `pdp.articles` 1, `pdp.bought_together` 1. Fix: port bd78461 to Headless. · Plan: P3.0
- [ ] **B2 · P0 · Headless has no step picker or variant URLs.** Hydrogen reads `pdp.steps` plus `pdp_variant_url` (173 entries in prod). · Plan: P3.1.1, P3.1.7
- [ ] **B3 · P1 · Duplicate variant-URL types.** `variant_url` (173) and `pdp_variant_url` (173) have the same fields. Delete `variant_url` once nothing reads it (Hydrogen moved off it in bd78461). · Plan: P3.0
- [ ] **B4 · P1 · No delivery data.** `pdp.policy` is defined but has 0 values, and the `pdp_policy` metaobject has 0 entries. The delivery estimate (handling min/max, transit extra) has nothing to show. Fix: create a default policy entry and link it to products. · Plan: P3.0
- [ ] **B5 · P1 · Videos are empty.** `pdp.videos` is defined, but `pdp_video` has 0 entries. Decide: fill it, or hide the section. · Plan: P3.0
- [ ] **B6 · P1 · Old `custom.*` values still exist in prod.** These are `custom.specs`, `custom.faq` and `custom.pdp_steps` (32 each), `custom.owners_manual` (10), `custom.assembly_video` (8), and `custom.related_articles` and `custom.frequently_bought_together` (1 each). Keep them until Oxygen is retired, then delete. · Plan: P5.5
- [ ] **B7 · P2 · Unused prod fields.** These are defined with 0 values: `custom.product_specs`, `technical_specifications`, `frequently_asked_questions`, `trust_badges`, `popular_searches`, `handling_days_min/max`, `transit_extra_days`, `pdp_banner`, `reassurance`, `expert_reviews`, `card_specs`, `card_badge`, `deals`, `after_item_lists`, `hub_hero`, `hub_guides`, `posts`. Never read by code: `benefits_grid`, `feature_grid`, `featured_highlights`, `product_bundles`, `product_policy`, `product_videos`, `specifications`, `hub_lifestyle_image`. Fix: delete after launch and remove the reads from code. · Plan: NEW P6.3
- [ ] **B8 · P1 · No announcement bar in prod.** The `announcement_bar` metaobject is missing there. Fix: run Hydrogen's `setup-announcements.ps1` on prod. · Plan: NEW P2.1.4
- [ ] **B9 · P2 · Metaobject types have drifted.** `reassurance_item` fields differ between stores, and 21 types exist only on dev (`accordion_block`, `promo_banner`, `technical_specification`, …). Decide keep or delete. · Plan: P6.3
- [ ] **B10 · P1 · `reviews.rating` has no definition** in either store; only `rating_count` exists. **Check** where card stars come from. · Plan: P2.2

## C. Cloudflare and caching

- [ ] **C1 · P0 · Nothing is cached between requests.** All Shopify and Yotpo caching goes through Next's `unstable_cache` (`src/compat/hydrogen.server.ts`). But `open-next.config.ts` sets no `incrementalCache`, so nothing persists. This is the likely root cause of the Yotpo "Too many subrequests" warning. Fix: enable the R2 (or KV) incremental cache and tag cache, then confirm cache hits in `wrangler tail`. **Check** with a cache test. · Plan: NEW P1.7
- [ ] **C2 · P0 · The free plan's subrequest cap.** · Plan: P1.3
- [ ] **C3 · P1 · Ratings are already stored in Shopify.** Prod has `yotpo.reviews_average` and `yotpo.reviews_count` metafields (6 products). Reading them in the product query removes per-product Yotpo calls for cards. · Plan: P2.2
- [ ] **C4 · P1 · Every push to `main` deploys to prod with no checks.** `.github/workflows/deploy.yml` has no typecheck step and no manual approval. Fix: add `pnpm typecheck` and a manual "Run workflow" trigger only. · Plan: P1.2
- [ ] **C5 · P1 · workers.dev can be indexed by Google.** No `noindex` on hosts other than ecombio.com, so it would duplicate the site after launch. Fix: send `X-Robots-Tag: noindex` when the host isn't www.ecombio.com. · Plan: NEW P1.8
- [ ] **C6 · P2 · Image costs.** The `IMAGES` binding (Cloudflare Images) may bill per resize. **Check** the cost, or size images with Shopify's CDN. · Plan: P4.3

## D. Codebase health

- [ ] **D1 · P1 · 75 files still import `~/compat`** (the Hydrogen shim): `src/lib` (11), `src/components` (9), `src/components/cart` (7) and others. Keep it for launch; remove it after. · Plan: P6.1
- [ ] **D2 · P1 · No error pages.** There's no `not-found.tsx`, `error.tsx` or `global-error.tsx` in `src/app`, so shoppers see Next's plain default pages. · Plan: NEW P4.5
- [ ] **D3 · P1 · Old URLs will 404.** The catch-all (`src/routes/$`) doesn't look up Shopify URL redirects the way Hydrogen's `storefrontRedirect` did, and `next.config.ts` `redirects()` is empty. · Plan: P5.2
- [ ] **D4 · P1 · No security headers.** There's no nosniff, Referrer-Policy or CSP; Hydrogen had them. Fix: add `headers()` in `next.config.ts`. · Plan: NEW P1.8
- [ ] **D5 · P1 · The middleware allows webhook paths that don't exist.** `/api/webhooks`, `/api/revalidate-*`, `/api/cron` and `/api/yotpo/webhook` are allowed for `hooks.ecombio.com`, but none of them exist. Build the product webhook (P2.1.3) and drop the rest. · Plan: P2.1
- [ ] **D6 · P2 · `pnpm lint` is broken.** It runs `eslint`, which isn't installed. Add it, or remove the script.
- [ ] **D7 · P2 · Unused dependencies:** `@intercom/messenger-js-sdk` (never imported) and the `cn` npm package (the repo has its own `src/lib/cn.ts`).
- [ ] **D8 · P2 · Leftover stock Hydrogen files:** CartMain, CartSummary, CartLineItem, ProductItem, PaginatedResourceSection, SearchForm*, SearchResults*. · Plan: P1.5.1
- [ ] **D9 · P2 · Footer TODOs:** placeholder social URLs, and no policy links. · Plan: P4.4
- [ ] **D10 · P2 · No automated tests.** Validation is manual. Add Playwright smoke tests for home, collection, PDP and cart. · Plan: P6
- [ ] **D11 · P1 · Klaviyo has an ID but no code.** `KLAVIYO_COMPANY_ID` is set, and nothing reads it. Decide: Shopify Email at launch, Klaviyo later. · Plan: P6.2

## E. Shopify apps (theme embeds don't run on a headless site)

- [ ] **E1 · P1 · Several prod apps only load inside a Liquid theme.** These are Klaviyo onsite tracking, Swell (loyalty), Usercentrics (consent), the Algolia app and Checkout Blocks (Shopify checkout only). None of them load on Headless. For each one: replace it in code, or uninstall it. Usercentrics and Headless's own consent banner overlap, so pick one. · Plan: NEW P2.6
- [ ] **E2 · P1 · Consent must gate tracking.** **Check** that the consent banner gates GA4 and Algolia events. · Plan: P2.5

## F. SEO

- [ ] **F1 · P1 · Sitemap is behind Hydrogen.** The sitemap XSL and full variant-URL paging (Hydrogen 4f210ca) are missing in Headless. · Plan: P3.3
- [ ] **F2 · P1 · Canonical URLs.** **Check** that canonicals and hreflang use https://www.ecombio.com, never workers.dev. · Plan: P3.3
- [ ] **F3 · P1 · robots.txt sitemap line.** robots.txt builds the sitemap URL from the request host, so on workers.dev it lists the workers.dev sitemap. Fixed by C5. · Plan: P1.8

## G. Process

- [ ] **G1 · Uncommitted files:** `CLAUDE.md`, `plan.md`, `checklist.md`, `specs/`, `validation/`. Commit them in the next batch.
- [x] **G2 · Spec P3.0 corrected.** It now matches the `pdp.*` fields that already exist in prod and in Hydrogen.
