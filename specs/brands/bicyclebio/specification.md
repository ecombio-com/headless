# BicycleBio: specification

Brand feature `bicyclebio` · Domain `bicyclebio.com` · Status: DONE✅
Part of the constitution: `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`. Workflow: `docs/brand-launch.md`.

## 1. Why
BicycleBio is a brand store for one product type (Electric bikes and bikes), so shoppers searching for it find a focused, trusted store (mission §2).

## 2. What
- `bicyclebio.com` and `www.bicyclebio.com` serve the Headless storefront as brand `bicyclebio`.
- Products, carts and orders come from the live Shopify store (khkkyb-b8) through its own Headless storefront.
- Checkout: cart → address → payment (Stripe, test mode for now); paid orders land in Shopify tagged `storefront=bicyclebio`.
- Not in scope here: the brand's own look and menus (roadmap Phase 2–4), live payments (Phase 6).

## 3. Setup per layer
| Layer | Value |
| --- | --- |
| Domain registrar | Namecheap (expires 2027-02-01) |
| DNS | Cloudflare zone bicyclebio.com |
| Email | Namecheap email forwarding (5 MX + SPF), unchanged |
| Shopify | Shopify Headless storefront "BicycleBio" (live store khkkyb-b8) |
| Cloudflare Worker | `headless-bicyclebio` (custom domains `bicyclebio.com`, `www.bicyclebio.com`) |
| GitHub | `ecombio-com/headless`, Environment `bicyclebio`, `.env.bicyclebio`, `wrangler.jsonc` env `bicyclebio` |
| Stripe | Created by hand in the Stripe dashboard (test mode) |

## 4. Acceptance criteria
- [ ] AC1 `https://bicyclebio.com/en-us` and `https://www.bicyclebio.com/en-us` return 200 from the Worker.
- [ ] AC2 The page shows `data-brand="bicyclebio"`.
- [ ] AC3 Store links point only to `khkkyb-b8.myshopify.com`; none to the dev store.
- [ ] AC4 The Worker has all 5 required secrets (check-brand.ps1).
- [ ] AC5 An unsigned POST to `/api/stripe/webhook` returns 400 (Stripe on, Cloudflare not blocking).
- [ ] AC6 The Stripe endpoint for this domain is enabled for `payment_intent.succeeded`.
- [ ] AC7 Always Use HTTPS on, Bot Fight Mode off, "Skip BIC for Stripe webhook" rule first.
- [ ] AC8 Email records still deliver (MX + SPF unchanged or replaced on purpose).
- [ ] AC9 A 4242 test payment succeeds and creates a Paid Shopify order with `storefront=bicyclebio`.
