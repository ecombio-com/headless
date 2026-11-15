# Cloudflare zone work for one brand, with the Cloudflare CLI (cf). Replaces the dashboard assistant.
# Once per computer: npm install --global cf ; cf auth login
# Usage:
#   pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action list     # read-only
#   pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action free     # delete Shopify records (asks first)
#   pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-zone.ps1 -Domain skaterbio.com -Action harden   # HTTPS, skip rule, Bot Fight Mode off
param(
  [Parameter(Mandatory)][string]$Domain,
  [Parameter(Mandatory)][ValidateSet('list','free','harden')][string]$Action
)
$ErrorActionPreference = 'Stop'

function Cf([string[]]$cfArgs) {
  $out = & cf @cfArgs
  if ($LASTEXITCODE -ne 0) { throw "cf $($cfArgs -join ' ') failed (exit $LASTEXITCODE)" }
  $text = ($out -join "`n").Trim()
  if (-not $text) { return $null }
  $json = $text | ConvertFrom-Json
  if ($null -ne $json.result) { return $json.result }
  return $json
}

$zone = @(Cf @('zones','list','--name',$Domain)) | Where-Object { $_.name -eq $Domain } | Select-Object -First 1
if (-not $zone) { throw "Zone $Domain not found in this Cloudflare account. Add it first (docs/brand-launch.md step 1)." }
$z = $zone.id
"== $Domain (zone status: $($zone.status))"

function Records { @(Cf @('dns','records','list','-z',$z)) }
function Show-Records($rows) { $rows | Sort-Object type, name | Format-Table type, name, content, priority -AutoSize | Out-String -Width 200 }
function Is-Shopify($r) {
  ($r.type -eq 'A'     -and $r.content -like '23.227.38.*') -or
  ($r.type -eq 'AAAA'  -and $r.content -like '2620:127:f00f:*') -or
  ($r.type -eq 'CNAME' -and $r.content -in @('shops.myshopify.com','dns-verification.shopify.com'))
}

switch ($Action) {
  'list' {
    Show-Records (Records)
    $https = Cf @('zones','settings','get','always_use_https','-z',$z)
    "Always Use HTTPS: $($https.value)"
    $bot = Cf @('bot-management','get','-z',$z)
    "Bot Fight Mode:   $($bot.fight_mode)"
    try { $rs = Cf @('rulesets','entrypoint','get','http_request_firewall_custom','-z',$z); $names = @($rs.rules | ForEach-Object { $_.description }) } catch { $names = @() }
    "Custom rules:     $(if ($names) { $names -join '; ' } else { 'none' })"
  }
  'free' {
    $all = Records
    $del = @($all | Where-Object { Is-Shopify $_ })
    "Before:"; Show-Records $all
    if (-not $del) { "No Shopify records left. Nothing to do."; break }
    "Will delete ONLY these $($del.Count) Shopify records:"; Show-Records $del
    $ok = Read-Host "Type DELETE to go on (anything else stops)"
    if ($ok -cne 'DELETE') { "Stopped. Nothing deleted."; break }
    foreach ($r in $del) { Cf @('dns','records','delete',$r.id,'-z',$z,'--force') | Out-Null; "deleted $($r.type) $($r.name) -> $($r.content)" }
    "After:"; Show-Records (Records)
  }
  'harden' {
    Cf @('zones','settings','edit','always_use_https','-z',$z,'--body','{"value":"on"}') | Out-Null
    "Always Use HTTPS: on"
    $bot = Cf @('bot-management','update','-z',$z,'--body','{"fight_mode":false}')
    "Bot Fight Mode:   $($bot.fight_mode)"
    $desc = 'Skip BIC for Stripe webhook'
    try { $rs = Cf @('rulesets','entrypoint','get','http_request_firewall_custom','-z',$z); $rules = @($rs.rules) } catch { $rules = @() }
    if ($rules | Where-Object { $_.description -eq $desc }) { "Skip rule:        already there" }
    else {
      $keep = @($rules | ForEach-Object { $_ | Select-Object action, action_parameters, description, enabled, expression })
      $new = [pscustomobject]@{ action = 'skip'; action_parameters = @{ products = @('bic') }; description = $desc; enabled = $true
        expression = '(http.request.uri.path eq "/api/stripe/webhook" and http.request.method eq "POST")' }
      $file = Join-Path $env:TEMP "cf-rules-$Domain.json"
      ConvertTo-Json -InputObject (@($new) + $keep) -Depth 10 | Set-Content $file -Encoding utf8
      Cf @('rulesets','entrypoint','update','http_request_firewall_custom','-z',$z,'--rules',"@$file") | Out-Null
      Remove-Item $file
      "Skip rule:        created (first in the list)"
    }
  }
}
