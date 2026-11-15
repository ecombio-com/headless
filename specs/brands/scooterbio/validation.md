# ScooterBio: validation

Brand feature `scooterbio` · Checked against `specification.md` §4 · Last run: 2026-11-14

## Results
| Check | Result | Verdict |
| --- | --- | --- |
| DNS | Nameservers aarav/mariah.ns.cloudflare.com; MX + SPF served by Cloudflare | PASS |
| Deploy | headless-scooterbio deployed (9072a7f) | PASS |
| scooterbio.com | 301 to www, served by Shopify (still attached in the dev store) | FAIL |
| www.scooterbio.com | 302 to Shopify login (old private Hydrogen storefront) | FAIL |
| Stripe webhook | 302 from Shopify (root still Shopify's) | FAIL |

## Findings (open)
- Shopify runs on Cloudflare too: while a Shopify store has the domain attached, Cloudflare sends its traffic to Shopify even when our DNS points at the Worker
- Same BicycleBio header/footer and menus as SkaterBio; ScooterBio content needed in Shopify
- Email: 20 Shopify forwards (some are account logins: stripe@, mercury@, klaviyo@, affirm@, klarna@, openai@) must move before the transfer

## Re-run
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\check-brand.ps1 -Brand scooterbio -Domain scooterbio.com
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain scooterbio.com -Action list
```
