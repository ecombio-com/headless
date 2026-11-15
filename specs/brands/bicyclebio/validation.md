# BicycleBio: validation

Brand feature `bicyclebio` · Checked against `specification.md` §4 · Last run: 2026-11-14

## Results
| Check | Result | Verdict |
| --- | --- | --- |
| Home page | 200, title "BicycleBio | Electric bikes by rider, class and brand" | PASS |
| www.bicyclebio.com | 200, same Worker | PASS |
| data-brand | bicyclebio | PASS |
| Store links | khkkyb-b8 only | PASS |
| Stripe webhook | 400 Bad signature (on, signed-only) | PASS |
| check-brand.ps1 | 12/12 PASS | PASS |
| Test order | #1004 Paid, storefront=bicyclebio, via ECOMBIOv2 | PASS |

## Findings (open)
- Order #1004 says "Shipping not required": bike variants likely have "physical product" off
- Trade-in links shown (header, footer, home, cart); there is no trade-in program
- Yotpo "Too many subrequests" on product pages (Workers Free cap; plan P2.2, P1.3)
- Cancel test order #1004 in Shopify
- Customer sign-in URLs for bicyclebio.com not added yet (P1.4)

## Re-run
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\check-brand.ps1 -Brand bicyclebio -Domain bicyclebio.com
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain bicyclebio.com -Action list
```
