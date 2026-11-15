# BicycleBio: implementation

Brand feature `bicyclebio` · Status: DONE✅ · Done: 2026-11-14
How it was built. The steps are `docs/brand-launch.md` steps 1–9.

## Commits
- `1acf964` First BicycleBio deploy (test host headless.bicyclebio.com)
- `c78c377` One Worker per brand: headless-bicyclebio on bicyclebio.com
- `f54a9a8` Stripe checkout on (test mode)

## Steps
| Step | Task | How | Status |
| --- | --- | --- | --- |
| 1 | Cloudflare zone | Already on Cloudflare | DONE✅ |
| 2 | Release the domain from Shopify | Removed everywhere in Shopify | DONE✅ |
| 3 | Headless storefront | Created in the live store | DONE✅ |
| 4 | Public values | .env.bicyclebio (by hand, before set-brand-env.ps1 existed) | DONE✅ |
| 5 | Secrets + Stripe webhook | wrangler secret put (by hand); Stripe endpoint in the dashboard | DONE✅ |
| 6 | Free DNS names + deploy | Placeholder Worker deleted; c78c377 | DONE✅ |
| 7 | Hardening | Always Use HTTPS on (Cloudflare assistant); Bot Fight Mode off; skip rule (confirm it was saved) | DONE✅ |
| 8 | Check script | check-brand.ps1: 12/12 PASS | DONE✅ |
| 9 | Test order | Order #1004, pi_3Ubom7HLRMhtdlt90n4sOUbt, $1,091.41 | DONE✅ |
