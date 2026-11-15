# SkaterBio: implementation

Brand feature `skaterbio` · Status: DONE✅ · Done: 2026-11-14
How it was built. The steps are `docs/brand-launch.md` steps 1–9.

## Commits
- `77bc613` Launch SkaterBio on skaterbio.com; brand scripts, cf-zone.ps1, constitution

## Steps
| Step | Task | How | Status |
| --- | --- | --- | --- |
| 1 | Cloudflare zone | Already active on Cloudflare | DONE✅ |
| 2 | Release the domain from the dev store | skaterbio.com + www removed | DONE✅ |
| 3 | Headless storefront | Created in the live store | DONE✅ |
| 4 | Public values | set-brand-env.ps1 -Brand skaterbio | DONE✅ |
| 5 | Secrets + Stripe webhook | set-brand-secrets.ps1 (6 secrets, endpoint we_1UbrdJ…) | DONE✅ |
| 6 | Free DNS names + deploy | 4 Shopify records deleted (MX + SPF kept); 77bc613 | DONE✅ |
| 7 | Hardening | cf-zone.ps1 -Action harden: HTTPS on, Bot Fight Mode off, skip rule created | DONE✅ |
| 8 | Check script | check-brand.ps1: 12/12 PASS | DONE✅ |
| 9 | Test order | Order #1005, pi_3UbsrQHLRMhtdlt9156NG1Cd, $1,091.41 | DONE✅ |
