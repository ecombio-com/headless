# SkaterBio: specification

Brand feature `skaterbio` · Domain `skaterbio.com` · Status: DONE✅
Part of the constitution: `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`. Workflow: `docs/brand-launch.md`.

## 1. Why
SkaterBio is a brand store for one product type (Electric skateboards, Onewheels and skateboards), so shoppers searching for it find a focused, trusted store (mission §2).

## 2. What
- `skaterbio.com` and `www.skaterbio.com` serve the Headless storefront as brand `skaterbio`.
- Products, carts and orders come from the live Shopify store (khkkyb-b8) through its own Headless storefront.
- Checkout: cart → address → payment (Stripe, test mode for now); paid orders land in Shopify tagged `storefront=skaterbio`.
- Not in scope here: the brand's own look and menus (roadmap Phase 2–4), live payments (Phase 6).

## 3. Setup per layer
| Layer | Value |
| --- | --- |
| Domain registrar | Namecheap (expires 2027-01-05) |
| DNS | Cloudflare zone 6ba98e373fa870f94dca16a5b373955d |
| Email | Namecheap email forwarding (5 MX + SPF), kept |
| Shopify | Shopify Headless storefront "SkaterBio" (live store khkkyb-b8) |
| Cloudflare Worker | `headless-skaterbio` (custom domains `skaterbio.com`, `www.skaterbio.com`) |
| GitHub | `ecombio-com/headless`, Environment `skaterbio`, `.env.skaterbio`, `wrangler.jsonc` env `skaterbio` |
| Stripe | we_1UbrdJHLRMhtdlt9swHJxRZE (created by set-brand-secrets.ps1, test mode) |

## 4. Acceptance criteria
- [ ] AC1 `https://skaterbio.com/en-us` and `https://www.skaterbio.com/en-us` return 200 from the Worker.
- [ ] AC2 The page shows `data-brand="skaterbio"`.
- [ ] AC3 Store links point only to `khkkyb-b8.myshopify.com`; none to the dev store.
- [ ] AC4 The Worker has all 5 required secrets (check-brand.ps1).
- [ ] AC5 An unsigned POST to `/api/stripe/webhook` returns 400 (Stripe on, Cloudflare not blocking).
- [ ] AC6 The Stripe endpoint for this domain is enabled for `payment_intent.succeeded`.
- [ ] AC7 Always Use HTTPS on, Bot Fight Mode off, "Skip BIC for Stripe webhook" rule first.
- [ ] AC8 Email records still deliver (MX + SPF unchanged or replaced on purpose).
- [ ] AC9 A 4242 test payment succeeds and creates a Paid Shopify order with `storefront=skaterbio`.
