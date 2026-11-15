# Step 5 of docs/brand-launch.md: put every secret on headless-<brand> and create its Stripe webhook.
# Values are never printed. Input is masked.
# Usage: pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-brand-secrets.ps1 -Brand skaterbio -Domain skaterbio.com
param(
  [Parameter(Mandatory)][ValidateSet('bicyclebio','scooterbio','skaterbio')][string]$Brand,
  [Parameter(Mandatory)][string]$Domain
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\Admin\Shopify\Storefronts\Headless'

function Put([string]$name, [string]$value) {
  if (-not $value) { throw "$name is empty. Stopped." }
  $value | pnpm exec wrangler secret put $name --env $Brand | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "wrangler failed on $name" }
  "stored  $name"
}
function Ask([string]$label) {
  for ($i = 1; $i -le 3; $i++) {
    $s = Read-Host "Paste $label" -AsSecureString
    $v = [Net.NetworkCredential]::new('', $s).Password.Trim()
    if ($v) { return $v }
    Write-Host "Nothing was pasted. Copy the value first, then right-click or Ctrl+V, then Enter. (try $i of 3)"
  }
  throw "$label was empty 3 times. Stopped."
}

# 1. New random session secret for this brand (never shared between brands)
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
Put 'SESSION_SECRET' ([Convert]::ToBase64String($bytes))

# 2. Shared live-store values: ECOMBIOv2 admin app (creates orders) and Klaviyo
$src = Get-Content 'C:\Users\Admin\Shopify\Storefronts\Hydrogen\.env.prod-bicyclebio'
foreach ($k in 'SHOPIFY_ADMIN_CLIENT_SECRET','KLAVIYO_PRIVATE_API_KEY') {
  $line = $src | Where-Object { $_ -match "^$k=" } | Select-Object -First 1
  Put $k (($line -split '=', 2)[1]).Trim('"')
}

# 3. Per-brand Shopify private token, and the shared Stripe secret key
Put 'PRIVATE_STOREFRONT_API_TOKEN' (Ask "PRIVATE_STOREFRONT_API_TOKEN (Shopify > Headless > $Brand storefront)")
Put 'STRIPE_SECRET_KEY' (Ask 'STRIPE_SECRET_KEY (sk_test_...)')

# 4. Stripe webhook endpoint for this domain; its signing secret goes straight to the Worker
$url = "https://$Domain/api/stripe/webhook"
$found = (stripe webhook_endpoints list --limit 100 | ConvertFrom-Json).data | Where-Object { $_.url -eq $url } | Select-Object -First 1
if ($found) {
  "Stripe endpoint $($found.id) already exists; Stripe shows its secret only once."
  Put 'STRIPE_WEBHOOK_SECRET' (Ask "its signing secret (whsec_...)")
} else {
  $ep = stripe webhook_endpoints create -d "url=$url" -d "enabled_events[]=payment_intent.succeeded" | ConvertFrom-Json
  Put 'STRIPE_WEBHOOK_SECRET' $ep.secret
  "created Stripe endpoint $($ep.id) -> $url"
}
"done: headless-$Brand has all 6 secrets"
