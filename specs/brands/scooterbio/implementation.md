# ScooterBio: implementation

Brand feature `scooterbio` · Status: IN PROGRESS⚠️ · Done: —
How it was built. The steps are `docs/brand-launch.md` steps 1–9.

## Commits
- `9072a7f` Launch ScooterBio on scooterbio.com; cf-zone fixes, cf-email script

## Steps
| Step | Task | How | Status |
| --- | --- | --- | --- |
| 1 | Cloudflare zone | cf-zone.ps1 -Action add (zone + MX/SPF copied); nameservers changed in Shopify; zone active | DONE✅ |
| 2 | Release the domain from Shopify | Skipped at first (registration stays in the dev store). Shopify still claims www and the root through Cloudflare | IN PROGRESS⚠️ |
| 3 | Headless storefront | Created in the live store | DONE✅ |
| 4 | Public values | set-brand-env.ps1 -Brand scooterbio | DONE✅ |
| 5 | Secrets + Stripe webhook | set-brand-secrets.ps1 (6 secrets, endpoint we_1Ubsue…) | DONE✅ |
| 6 | Deploy | 9072a7f, all 3 jobs passed; root and www DNS point to the Worker | DONE✅ |
| 6c | Remove www + account subdomains in the dev store | So www reaches the Worker | IN PROGRESS⚠️ |
| 6d | Stripe webhook URL → www | stripe webhook_endpoints update | NOT STARTED❌ |
| 7 | Hardening | cf-zone.ps1 -Action harden | NOT STARTED❌ |
| 8 | Check script | check-brand.ps1 -Domain www.scooterbio.com | NOT STARTED❌ |
| 9 | Test order | — | NOT STARTED❌ |
| 10 | Registration → Cloudflare Registrar | Ends Shopify's hold on the root and on renewals; before 2027-01-25 | NOT STARTED❌ |
