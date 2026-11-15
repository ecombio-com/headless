# Email for a brand domain with Cloudflare Email Routing (free): <name>@<domain> forwards to an inbox you own.
# Receive only. Sending as support@<domain> needs a mail provider later.
# Usage:
#   pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\cf-email.ps1 -Domain skaterbio.com -To <inbox> -Addresses support -CatchAll
# Re-run safely: it skips what already exists. The first run per inbox sends Cloudflare's verification email: click it, then run again.
param(
  [Parameter(Mandatory)][string]$Domain,
  [Parameter(Mandatory)][string]$To,
  [string[]]$Addresses = @('support'),
  [switch]$CatchAll
)
$ErrorActionPreference = 'Stop'
$env:CLOUDFLARE_ACCOUNT_ID = 'c5afcd7a40473a388dee67294b72b833'
$cfExe = (Get-Command cf -CommandType Application, ExternalScript -ErrorAction Stop | Select-Object -First 1).Source
function Invoke-Cf([string[]]$cfArgs) {
  Write-Host "-> cf $($cfArgs -join ' ')" -ForegroundColor DarkGray
  $out = $null | & $cfExe @cfArgs --quiet
  if ($LASTEXITCODE -ne 0) { throw "cf $($cfArgs -join ' ') failed (exit $LASTEXITCODE)" }
  $lines = @($out | ForEach-Object { "$_" })
  $start = 0; while ($start -lt $lines.Count -and $lines[$start] -notmatch '^\s*[\[{]') { $start++ }
  if ($start -ge $lines.Count) { return $null }
  $json = ($lines[$start..($lines.Count - 1)] -join "`n") | ConvertFrom-Json
  if ($null -ne $json.result) { return $json.result }
  return $json
}

$zone = @(Invoke-Cf @('zones','list','--name',$Domain)) | Where-Object { $_.name -eq $Domain } | Select-Object -First 1
if (-not $zone -or $zone.status -ne 'active') { throw "$Domain is not an active zone in Cloudflare yet." }
$z = $zone.id
"== email for $Domain -> $To"

# 1. The inbox must be a verified destination (one email from Cloudflare, once per inbox)
$dest = @(Invoke-Cf @('email-routing','addresses','list')) | Where-Object { $_.email -eq $To } | Select-Object -First 1
if (-not $dest) {
  Invoke-Cf @('email-routing','addresses','create','--body',(@{ email = $To } | ConvertTo-Json -Compress)) | Out-Null
  "Cloudflare sent a verification email to $To. Click its link, then run this command again."; return
}
if (-not $dest.verified) { "$To is not verified yet. Click the link in Cloudflare's email, then run this command again."; return }
"inbox verified: $To"

# 2. Switch the domain's mail to Cloudflare (replaces old MX + SPF, after you confirm)
$recs = @(Invoke-Cf @('dns','records','list','-z',$z))
$oldMx = @($recs | Where-Object { $_.type -eq 'MX' -and $_.content -notlike '*.mx.cloudflare.net' })
$oldSpf = @($recs | Where-Object { $_.type -eq 'TXT' -and $_.name -eq $Domain -and $_.content -like '*v=spf1*' -and $_.content -notlike '*_spf.mx.cloudflare.net*' })
if ($oldMx -or $oldSpf) {
  "These old mail records stop working once Cloudflare takes over:"
  ($oldMx + $oldSpf) | Format-Table type, content, priority -AutoSize | Out-String -Width 200
  "Any forwarding set up at the old provider stops too. -CatchAll keeps every other address arriving at $To."
  $ok = Read-Host "Type SWITCH to replace them with Cloudflare Email Routing (anything else stops)"
  if ($ok -cne 'SWITCH') { "Stopped. Nothing changed."; return }
  foreach ($r in ($oldMx + $oldSpf)) { Invoke-Cf @('dns','records','delete',$r.id,'-z',$z,'--force') | Out-Null; "deleted $($r.type) $($r.content)" }
}
Invoke-Cf @('email-routing','enable','-z',$z) | Out-Null
"Email Routing: on (Cloudflare added its MX + SPF records)"

# 3. One rule per address, plus the optional catch-all
$rules = @(Invoke-Cf @('email-routing','rules','list-account','-z',$z))
foreach ($a in $Addresses) {
  $addr = "$a@$Domain"
  if ($rules | Where-Object { $_.matchers.value -contains $addr }) { "exists  $addr"; continue }
  $body = @{ name = $addr; enabled = $true; matchers = @(@{ type = 'literal'; field = 'to'; value = $addr }); actions = @(@{ type = 'forward'; value = @($To) }) } | ConvertTo-Json -Depth 5 -Compress
  Invoke-Cf @('email-routing','rules','create','-z',$z,'--body',$body) | Out-Null
  "created $addr -> $To"
}
if ($CatchAll) {
  $body = @{ enabled = $true; matchers = @(@{ type = 'all' }); actions = @(@{ type = 'forward'; value = @($To) }) } | ConvertTo-Json -Depth 5 -Compress
  Invoke-Cf @('email-routing','rules','catch-all','update','-z',$z,'--body',$body) | Out-Null
  "catch-all: every other address@$Domain -> $To"
}
"done. Test: send an email to $($Addresses[0])@$Domain"
