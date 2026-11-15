# P1.4 customer sign-in: secrets for Better Auth. Values are never printed. Input is masked.
# Local dev:  pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-auth-secrets.ps1 -Local
# A brand:    pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-auth-secrets.ps1 -Brand bicyclebio [-Google] [-Brevo]
param(
  [ValidateSet('bicyclebio','scooterbio','skaterbio')][string]$Brand,
  [switch]$Local,
  [switch]$Google,
  [switch]$Brevo
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\Admin\Shopify\Storefronts\Headless'
if (-not $Local -and -not $Brand) { throw 'Pass -Local or -Brand <brand>.' }

function NewSecret {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes)
}
function Ask([string]$label) {
  for ($i = 1; $i -le 3; $i++) {
    $s = Read-Host "Paste $label" -AsSecureString
    $v = [Net.NetworkCredential]::new('', $s).Password.Trim()
    if ($v) { return $v }
    Write-Host "Nothing was pasted. (try $i of 3)"
  }
  throw "$label was empty 3 times. Stopped."
}

if ($Local) {
  $f = '.env.local'
  $c = @(Get-Content $f)
  if ($c -match '^BETTER_AUTH_SECRET=.+') { 'BETTER_AUTH_SECRET already in .env.local (kept)' }
  else { Add-Content $f "BETTER_AUTH_SECRET=$(NewSecret)"; 'added BETTER_AUTH_SECRET to .env.local' }
  return
}

function Put([string]$name, [string]$value) {
  $value | pnpm exec wrangler secret put $name --env $Brand | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "wrangler failed on $name" }
  "stored  $name on headless-$Brand"
}

# New random secret per brand (never shared between brands). Re-setting signs everyone out, so only when missing.
$names = (pnpm exec wrangler secret list --env $Brand --format json | ConvertFrom-Json).name
if ($names -contains 'BETTER_AUTH_SECRET') { 'BETTER_AUTH_SECRET already set (kept)' } else { Put 'BETTER_AUTH_SECRET' (NewSecret) }

if ($Google) {
  Put 'GOOGLE_CLIENT_ID' (Ask "GOOGLE_CLIENT_ID for $Brand")
  Put 'GOOGLE_CLIENT_SECRET' (Ask "GOOGLE_CLIENT_SECRET for $Brand")
}

if ($Brevo) {
  Put 'BREVO_API_KEY' (Ask "BREVO_API_KEY (Brevo > SMTP & API > API keys)")
}
