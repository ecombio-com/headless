# Fails if any sign-in, account or logout URL ends up on ecombio.com or shopify.com/authentication.
# Usage: pwsh -File scripts\check-redirects.ps1 [-Brands bicyclebio,scooterbio,skaterbio]
param([string[]]$Brands = @('bicyclebio','scooterbio','skaterbio'))
$bad = 0
foreach ($b in $Brands) {
  foreach ($start in "https://www.$b.com/en-us/account/login","https://www.$b.com/en-us/account/authorize","https://www.$b.com/en-us/account/logout","https://www.$b.com/en-us/account","https://www.$b.com/en-us/account/orders","https://auth.$b.com/?return_to=/en-us/account") {
    $url = $start; $fail = $false; $chain = @()
    for ($i = 1; $i -le 8; $i++) {
      $o = curl.exe -s -o NUL --max-time 25 -w "%{http_code}|%{redirect_url}" $url
      $code, $next = $o -split '\|', 2
      $chain += "[$code] $(($url -split '\?')[0])"
      if ($url -match 'ecombio\.com|shopify\.com/authentication') { $fail = $true }
      if ($code -eq '000') { $fail = $true; break }
      if (-not $next) { break }
      $url = $next
    }
    if ($fail) { $bad++ }
    "{0}  {1}`n    {2}" -f ($(if ($fail) {'FAIL'} else {'ok  '})), $start, ($chain -join '  ->  ')
  }
}
"`n$bad failing URL(s)."
if ($bad) { exit 1 }