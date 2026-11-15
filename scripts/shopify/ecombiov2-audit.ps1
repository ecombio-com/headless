# READ-ONLY audit of the ECOMBIOv2 app on the live store (khkkyb-b8). Changes nothing.
# Prints: app scopes needed for collections/menus/publishing, all collections, all menus, all publications (sales channels).
$ErrorActionPreference = 'Stop'
$Store = 'khkkyb-b8.myshopify.com'
$Api   = '2026-07'
$Id     = [Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_ID', 'User')
$Secret = [Environment]::GetEnvironmentVariable('SHOPIFY_ECOMBIOV2_CLIENT_SECRET', 'User')
if (-not $Id -or -not $Secret) { throw 'Missing SHOPIFY_ECOMBIOV2_CLIENT_ID / _SECRET in Windows user env vars.' }

$tok = (Invoke-RestMethod -Method Post -Uri "https://$Store/admin/oauth/access_token" -ContentType 'application/json' `
  -Body (@{grant_type='client_credentials'; client_id=$Id; client_secret=$Secret} | ConvertTo-Json)).access_token

function Gql($q) {
  $r = Invoke-RestMethod -Method Post -Uri "https://$Store/admin/api/$Api/graphql.json" `
    -Headers @{'X-Shopify-Access-Token'=$tok} -ContentType 'application/json' -Body (@{query=$q} | ConvertTo-Json -Compress)
  if ($r.errors) { throw ($r.errors | ConvertTo-Json -Depth 6) }
  $r.data
}

# 1. Scopes
$app = (Gql '{ currentAppInstallation { app { title } accessScopes { handle } } }').currentAppInstallation
$scopes = $app.accessScopes.handle
Write-Host "`n== App: $($app.app.title) | $($scopes.Count) scopes" -ForegroundColor Cyan
foreach ($s in 'read_products','write_products','read_online_store_navigation','write_online_store_navigation',
               'read_online_store_pages','write_online_store_pages','read_publications','write_publications') {
  '{0,-32} {1}' -f $s, $(if ($scopes -contains $s) {'YES'} else {'MISSING'})
}

# 2. Collections
$c = (Gql '{ collections(first:250, sortKey:TITLE) { nodes { handle title productsCount { count } ruleSet { appliedDisjunctively rules { column relation condition } } } } }').collections.nodes
Write-Host "`n== Collections: $($c.Count)" -ForegroundColor Cyan
$c | ForEach-Object {
  $rule = if ($_.ruleSet) { ($_.ruleSet.rules | ForEach-Object { "$($_.column) $($_.relation) '$($_.condition)'" }) -join ($(if ($_.ruleSet.appliedDisjunctively) {' OR '} else {' AND '})) } else { 'manual' }
  '{0,-40} {1,5}  {2}' -f $_.handle, $_.productsCount.count, $rule
}

# 3. Menus
$m = (Gql '{ menus(first:50) { nodes { id handle title items { title } } } }').menus.nodes
Write-Host "`n== Menus: $($m.Count)" -ForegroundColor Cyan
$m | ForEach-Object { '{0,-24} {1,3} items  {2}' -f $_.handle, $_.items.Count, $_.id }

# 4. Publications (sales channels / Headless storefronts)
$p = (Gql '{ publications(first:50) { nodes { id name } } }').publications.nodes
Write-Host "`n== Publications: $($p.Count)" -ForegroundColor Cyan
$p | ForEach-Object { '{0,-40} {1}' -f $_.name, $_.id }
