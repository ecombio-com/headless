# ScooterBio: specification

Brand feature `scooterbio` · Domain `scooterbio.com` · Status: IN PROGRESS⚠️
Part of the constitution: `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`. Workflow: `docs/brand-launch.md`.

## 1. Why
ScooterBio is a brand store for one product type (Electric scooters and kick scooters), so shoppers searching for it find a focused, trusted store (mission §2).

## 2. What
- `scooterbio.com` and `www.scooterbio.com` serve the Headless storefront as brand `scooterbio`.
- Products, carts and orders come from the live Shopify store (khkkyb-b8) through its own Headless storefront.
- Checkout: cart → address → payment (Stripe, test mode for now); paid orders land in Shopify tagged `storefront=scooterbio`.
- Not in scope here: the brand's own look and menus (roadmap Phase 2–4), live payments (Phase 6).

## 3. Setup per layer
| Layer | Value |
| --- | --- |
| Domain registrar | Shopify, on the dev store (Tucows; expires 2027-01-25). Dev store cannot pay renewals |
| DNS | Cloudflare zone 3191d1160d5a7129985b14a0457ea843 (nameservers changed in Shopify) |
| Email | Shopify email forwarding, 20 addresses; MX + SPF copied into Cloudflare. Move to Cloudflare Email Routing before the domain leaves Shopify (P6.4) |
| Shopify | Shopify Headless storefront "ScooterBio" (live store khkkyb-b8) |
| Cloudflare Worker | `headless-scooterbio` (custom domains `scooterbio.com`, `www.scooterbio.com`) |
| GitHub | `ecombio-com/headless`, Environment `scooterbio`, `.env.scooterbio`, `wrangler.jsonc` env `scooterbio` |
| Stripe | we_1UbsueHLRMhtdlt9IuUdWGlX (created by set-brand-secrets.ps1, test mode); URL must move to www while Shopify holds the root |

## 4. Acceptance criteria
- [ ] AC1 `https://scooterbio.com/en-us` and `https://www.scooterbio.com/en-us` return 200 from the Worker.
- [ ] AC2 The page shows `data-brand="scooterbio"`.
- [ ] AC3 Store links point only to `khkkyb-b8.myshopify.com`; none to the dev store.
- [ ] AC4 The Worker has all 5 required secrets (check-brand.ps1).
- [ ] AC5 An unsigned POST to `/api/stripe/webhook` returns 400 (Stripe on, Cloudflare not blocking).
- [ ] AC6 The Stripe endpoint for this domain is enabled for `payment_intent.succeeded`.
- [ ] AC7 Always Use HTTPS on, Bot Fight Mode off, "Skip BIC for Stripe webhook" rule first.
- [ ] AC8 Email records still deliver (MX + SPF unchanged or replaced on purpose).
- [ ] AC9 A 4242 test payment succeeds and creates a Paid Shopify order with `storefront=scooterbio`.
