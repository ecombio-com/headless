# Step 4 of docs/brand-launch.md: write a brand's two public Shopify values into .env.<brand>.
# Input is masked. Usage: pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-brand-env.ps1 -Brand skaterbio
param([Parameter(Mandatory)][ValidateSet('bicyclebio','scooterbio','skaterbio')][string]$Brand)
$f = "C:\Users\Admin\Shopify\Storefronts\Headless\.env.$Brand"
$c = Get-Content $f
foreach ($k in 'PUBLIC_STOREFRONT_API_TOKEN','PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID') {
  $s = Read-Host "Paste $k for $Brand" -AsSecureString
  $v = [Net.NetworkCredential]::new('', $s).Password.Trim()
  if (-not $v) { throw "$k is empty. Nothing was saved." }
  $c = $c -replace "^$k=.*", "$k=$v"
  "updated $k"
}
Set-Content $f $c -Encoding ascii
"saved .env.$Brand"
