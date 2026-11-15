# P1.4: turn on Better Auth for a brand's live Worker. Safe to re-run.
#  1. Applies migrations/auth to the brand's D1 database (remote).
#  2. Sets BETTER_AUTH_SECRET on headless-<brand> only if it isn't there yet (re-setting would sign everyone out).
# Values are never printed.
# Usage: pwsh -File C:\Users\Admin\Shopify\Storefronts\Headless\scripts\enable-auth.ps1 -Brand bicyclebio
param([Parameter(Mandatory)][ValidateSet('bicyclebio','scooterbio','skaterbio')][string]$Brand)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\Admin\Shopify\Storefronts\Headless'

"== $Brand: D1 migrations (headless-auth-$Brand)"
pnpm exec wrangler d1 migrations apply "headless-auth-$Brand" --env $Brand --remote
if ($LASTEXITCODE -ne 0) { throw "migrations failed for $Brand" }

"== $Brand: BETTER_AUTH_SECRET"
pwsh -File 'C:\Users\Admin\Shopify\Storefronts\Headless\scripts\set-auth-secrets.ps1' -Brand $Brand

"== $Brand: done"
