# SkaterBio: validation

Brand feature `skaterbio` · Checked against `specification.md` §4 · Last run: 2026-11-14

## Results
| Check | Result | Verdict |
| --- | --- | --- |
| Home page | 200, title "SkaterBio | Electric skateboards and Onewheels" | PASS |
| www.skaterbio.com | 200 (after about 1 minute of Cloudflare setup) | PASS |
| data-brand | skaterbio | PASS |
| Store links | khkkyb-b8 only | PASS |
| Email records | 5 MX + SPF unchanged | PASS |
| Hardening | HTTPS on, Bot Fight Mode off, "Skip BIC for Stripe webhook" | PASS |
| check-brand.ps1 | 12/12 PASS | PASS |
| Test order | #1005 Paid, webhook delivered | PASS |

## Findings (open)
- Uses BicycleBio's header and footer: menus show e-bike collections, trade-in and bike guides
- /collections/all lists bikes: SkaterBio products and menus (skaterbio-main, skaterbio-footer, skaterbio-all) need content in Shopify
- Cancel test order #1005 in Shopify
- cf-zone.ps1 -Action list prints the DNS record table blank (display bug; records are fine)

## Re-run
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\check-brand.ps1 -Brand skaterbio -Domain skaterbio.com
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action list
```
