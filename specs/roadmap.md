# Roadmap

Part of the Headless constitution. `roadmap.md` = phases and outcomes. `plan.md` = the tasks, status and log.
Status marks: DONE✅ · IN PROGRESS⚠️ · NOT STARTED❌

## Phase 0. Foundation: the codebase exists — DONE✅
- Hydrogen storefront ported to Next.js 16; build passes (commit `65891fe`).
- OpenNext Cloudflare adapter; deploy through GitHub Actions.

## Phase 1. First brand live: bicyclebio.com — DONE✅ (2026-11-14)
- One Worker per brand (`headless-bicyclebio`), Shopify Headless storefront, GitHub Environment.
- bicyclebio.com + www on the Worker; Always Use HTTPS; Bot Fight Mode off; webhook skip rule (confirm it was saved).
- Stripe checkout in test mode; test order #1004 landed in Shopify as Paid.
- `scripts/check-brand.ps1`: 12/12 PASS. Workflow recorded in `docs/brand-launch.md`.
- Plan items: P1.6, P2.4 (test mode).

## Phase 2. BicycleBio polish — IN PROGRESS⚠️
- Bikes marked as physical products (order said "Shipping not required").
- Trade-in links removed (no trade-in program).
- Test order #1004 cancelled.
- Customer sign-in on bicyclebio.com (P1.4).
- Persistent cache + Workers Paid decision (checklist C1, P1.3), ending the Yotpo subrequest warning (P2.2).
- Done when: check script passes, a second test order ships correctly, sign-in works.

## Phase 3. Brand family: skaterbio.com, then scooterbio.com — NOT STARTED❌
- SkaterBio first (DNS already on Cloudflare): `docs/brand-launch.md` steps 2–9 (P1.7).
- ScooterBio second (move DNS from Google Domains to Cloudflare first): steps 1–9 (P1.8).
- Shopify content per brand: menus `<brand>-main` / `<brand>-footer`, collection `<brand>-all`, products on the Headless channel.
- Done when: each brand passes the check script and a test order lands in Shopify.

## Phase 4. Product depth: PDP and pages — NOT STARTED❌ (P3.0 started early)
- PDP reads `pdp.*` metafields; step picker, variant URLs, recap sheets, banner, reassurance bar (P3.0, P3.1).
- Pages, blogs, collections and home brought up to the Hydrogen reference (P3.2–P3.4).
- Each brand gets its own look (tokens, header, home), starting with BicycleBio.
- Done when: every Hydrogen-only gap is closed or dropped on purpose.

## Phase 5. Quality and trust — NOT STARTED❌
- Error pages, security headers, robots/noindex on non-brand hosts, canonical URLs (checklist C5, D2, D4, F2).
- Screen sizes, keyboard access, speed (P4.1–P4.3).
- Search on (Algolia), Shopify analytics events, consent gating (P2.3, P2.5).
- Automated smoke tests in CI (checklist D10), typecheck before deploy (C4).

## Phase 6. Go live for real — NOT STARTED❌
- Live Stripe keys and a live webhook per brand.
- Rotate every key and secret (Shopify apps, Stripe, Algolia, Yotpo, Klaviyo).
- One real order and refund per brand.
- Watch two weeks: `wrangler tail`, Search Console, GA4 (P5.4).
- Done when: two clean weeks on all three brands.

## Phase 7. After launch — NOT STARTED❌
- Remove the compat layer and generated routes (P6.1).
- Clean up unused metafields and metaobjects (P6.3).
- Bring back extras: Klaviyo, llms.txt, shop agent, Spanish, bundles, gift cards, expert reviews (P6.2).
- Decide whether ecombio.com joins this repo.

## Holiday freeze
- Nov 25 – Dec 1: no live-store changes during BFCM.
