# End-to-end health check for one brand storefront. Read-only: changes nothing.
# Usage: powershell -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\check-brand.ps1 -Brand bicyclebio -Domain bicyclebio.com
param(
  [string]$Brand = 'bicyclebio',
  [string]$Domain = 'bicyclebio.com'
)
Set-Location 'C:\Users\Admin\Shopify\Storefronts\Headless'
$script:fails = 0
function Show([string]$name, [bool]$ok, [string]$detail = '') {
  if (-not $ok) { $script:fails++ }
  $mark = if ($ok) { 'PASS' } else { 'FAIL' }
  '{0}  {1} {2}' -f $mark, $name, $detail
}
"== $Brand ($Domain) =="

# 1. GitHub: last deploy run
if (Get-Command gh -ErrorAction SilentlyContinue) {
  $run = (gh run list -R ecombio-com/headless -L 1 --json status,conclusion,displayTitle | ConvertFrom-Json)[0]
  Show 'GitHub deploy' ($run.conclusion -eq 'success') "- $($run.displayTitle) [$($run.status)/$($run.conclusion)]"
} else { 'SKIP  GitHub deploy (install: winget install -e --id GitHub.cli)' }

# 2. Cloudflare: Worker secret names (values are never shown)
$raw = (pnpm exec wrangler secret list --env $Brand 2>$null) -join "`n"
$start = $raw.IndexOf('[')
$names = if ($start -ge 0) { ($raw.Substring($start) | ConvertFrom-Json).name } else { @() }
foreach ($n in 'PRIVATE_STOREFRONT_API_TOKEN','SESSION_SECRET','SHOPIFY_ADMIN_CLIENT_SECRET','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET') {
  Show "Worker secret $n" ($names -contains $n)
}

# 3. Site
try { $h = Invoke-WebRequest "https://$Domain/en-us" -UseBasicParsing; $body = $h.Content; $code = [int]$h.StatusCode } catch { $body = ''; $code = [int]$_.Exception.Response.StatusCode }
Show 'Home page' ($code -eq 200) "- HTTP $code"
Show 'Brand' ($body -match "data-brand=`"$Brand`"")
Show 'Live store (khkkyb-b8) links' ($body -match 'khkkyb-b8\.myshopify\.com')
Show 'No dev store links' (-not ($body -match 'ecombio\.myshopify\.com'))

# 4. Stripe webhook path: an unsigned POST must be rejected with 400
try { $r = Invoke-WebRequest "https://$Domain/api/stripe/webhook" -Method Post -Body '{}' -ContentType 'application/json' -UseBasicParsing; $wc = [int]$r.StatusCode } catch { $wc = [int]$_.Exception.Response.StatusCode }
Show 'Stripe webhook reachable' ($wc -eq 400) "- HTTP $wc (400 = on; 404 = Stripe off; 403 = Cloudflare blocking)"

# 5. Stripe: endpoint registered for this domain
if (Get-Command stripe -ErrorAction SilentlyContinue) {
  $eps = (stripe webhook_endpoints list --limit 100 | ConvertFrom-Json).data
  $ep = $eps | Where-Object { $_.url -eq "https://$Domain/api/stripe/webhook" } | Select-Object -First 1
  Show 'Stripe endpoint' ($null -ne $ep -and $ep.status -eq 'enabled' -and $ep.enabled_events -contains 'payment_intent.succeeded') $(if ($ep) { "- $($ep.status), livemode=$($ep.livemode)" } else { '- not found' })
} else { 'SKIP  Stripe endpoint (install: winget install -e --id Stripe.StripeCli)' }

"== $script:fails failed =="
