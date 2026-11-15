# Brand launch workflow

How bicyclebio.com went live. Repeat it for each brand.

| Brand | Domain | Status |
| --- | --- | --- |
| BicycleBio | bicyclebio.com | DONE✅ 2026-11-14 (test order #1004) |
| SkaterBio | skaterbio.com | IN PROGRESS⚠️ (DNS on Cloudflare; registrar Namecheap) |
| ScooterBio | scooterbio.com | IN PROGRESS⚠️ (step 1: registered through Shopify; DNS moving to Cloudflare) |

## The setup

| Layer | One per brand | Shared |
| --- | --- | --- |
| Shopify (live store khkkyb-b8 / ecombio-store) | Headless storefront, its tokens | Products, orders, ECOMBIOv2 admin app |
| Cloudflare | Worker `headless-<brand>`, zone `<brand>.com` | Account, request quota |
| GitHub `ecombio-com/headless` | Environment `<brand>`, file `.env.<brand>`, block in `wrangler.jsonc` | One `main` branch, one codebase |
| Stripe (acct_1UZHiQHLRMhtdlt9) | Webhook endpoint `https://<brand>.com/api/stripe/webhook` | Account, API keys |

The brand is picked by `BRAND=<brand>` in `.env.<brand>`. Already prepared in the repo for skaterbio and scooterbio: the `wrangler.jsonc` block and the `.env.<brand>` file.

Use PowerShell 7 (`pwsh`). Values you paste are masked.

## Once per computer

```powershell
winget install -e --id GitHub.cli; winget install -e --id Stripe.StripeCli
gh auth login --hostname github.com --git-protocol https --web; stripe login
npm install --global cf; cf auth login
```
`cf` is Cloudflare's own CLI (DNS, zones, security rules). `wrangler` stays for Workers, secrets and logs.

## Steps per brand

Replace `skaterbio` with the brand in every command.

### 1. Cloudflare zone (ScooterBio only)
scooterbio.com is registered through Shopify (registrar Tucows, Shopify DNS on `ns-cloud-b*.googledomains.com`). It stays registered at Shopify; only its DNS moves.
- Add the site (Free plan): https://dash.cloudflare.com/c5afcd7a40473a388dee67294b72b833/add-site. Keep the imported email records: MX `1 mx.scooterbio.com.cust.b.hostedemail.com` and TXT `v=spf1 include:_spf.hostedemail.com ~all`.
- In the Shopify store that owns the domain: Settings → Domains → scooterbio.com → DNS settings → Nameservers → replace with the two Cloudflare gives you. Do not click "Remove domain".
- Steps 3–5 can run while the change spreads (it can take hours to days).
- Check (done when both answers end in `ns.cloudflare.com`):
```powershell
Resolve-DnsName scooterbio.com -Type NS -Server 1.1.1.1 | Select-Object NameHost
```

### 2. Release the domain from the dev store (domains bought elsewhere only)
Dev store Settings → Domains: https://admin.shopify.com/store/ecombio/settings/domains. Remove `<brand>.com` and `www.<brand>.com`.

### 3. Shopify Headless storefront (live store)
- Create it: https://admin.shopify.com/store/ecombio-store/headless → Create storefront → name it (e.g. `SkaterBio`).
- Keep open: Storefront API public token, private token; Customer Account API client ID.
- Content check on the live store: menus `<brand>-main` and `<brand>-footer`; collection `<brand>-all`; products available on the Headless channel.

### 4. Public values into `.env.<brand>`
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-brand-env.ps1 -Brand skaterbio
```

### 5. Secrets + Stripe webhook
Creates `headless-<brand>` if needed, stores all 6 secrets, creates the Stripe endpoint and stores its signing secret. It asks for 2 values: the Shopify private token and `sk_test_...` (https://dashboard.stripe.com/acct_1UZHiQHLRMhtdlt9/test/apikeys).
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-brand-secrets.ps1 -Brand skaterbio -Domain skaterbio.com
```

### 6. Free the DNS names, then deploy
Lists every record, shows the Shopify ones it will delete (A/AAAA at the root, www and verification CNAMEs), waits for you to type DELETE, then lists again. MX and TXT records are never touched.
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action free
```

Then add the brand to the deploy list and push:
```powershell
cd C:\Users\Admin\Shopify\Storefronts\Headless; $f='.github\workflows\deploy.yml'; (Get-Content $f) -replace 'brand: \[(.*)\]', 'brand: [$1, skaterbio]' | Set-Content $f -Encoding ascii; git add .github/workflows/deploy.yml wrangler.jsonc .env.skaterbio scripts/cf-zone.ps1 scripts/check-brand.ps1 scripts/set-brand-env.ps1 scripts/set-brand-secrets.ps1 docs/brand-launch.md plan.md; git commit -m "Launch SkaterBio on skaterbio.com"; git push origin main; gh run watch -R ecombio-com/headless
```

### 7. Cloudflare hardening (after the deploy succeeds)
Always Use HTTPS on, Bot Fight Mode off, and the "Skip BIC for Stripe webhook" rule (added once, placed first).
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action harden
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action list
```

### 8. Verify (read-only)
```powershell
pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\check-brand.ps1 -Brand skaterbio -Domain skaterbio.com
```
Done when it ends with `== 0 failed ==`. If your PC says the site can't be found, run `Clear-DnsClientCache` and restart the browser.

### 9. Test order
- Second window, live logs: `cd C:\Users\Admin\Shopify\Storefronts\Headless; pnpm exec wrangler tail headless-skaterbio --format pretty`
- Buy one item on `https://<brand>.com/en-us` with card `4242 4242 4242 4242`, any future date, any 3-digit code.
- Confirm:
```powershell
(stripe payment_intents list --limit 1 | ConvertFrom-Json).data | Select-Object id, status, amount, @{n='shopify_order';e={$_.metadata.shopify_order_name}}
```
- Done when status is `succeeded` and a Shopify order number shows. Cancel the test order in Shopify afterwards.

## Rules learned on BicycleBio
- Deploy only through GitHub. A local `pnpm run deploy` packs `.env.local` (dev values and secrets) into the Worker.
- Add a brand to the deploy list only after its secrets exist and its DNS names are free.
- Worker settings override `.env.<brand>`; `.env.<brand>` holds public values only.
- A Worker custom domain can't attach while an old A or CNAME record sits on that name.
- Never paste keys into any chat, including Cloudflare's assistant. Use the scripts.
- Scripts and CLIs first (`cf`, `wrangler`, `gh`, `stripe`); dashboards and AI assistants only where no command exists (today: creating a Shopify Headless storefront).

## Open for every brand (after launch)
- Customer sign-in: callback, logout and origin URLs for `<brand>.com` in the storefront's Customer Account API settings.
- Live Stripe keys (switch `.env.<brand>` pk and the Worker's `STRIPE_SECRET_KEY`, new live webhook).
- Rotate all keys at public launch.
