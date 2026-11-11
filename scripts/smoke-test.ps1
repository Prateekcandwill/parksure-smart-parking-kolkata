# ParkSure route smoke test.
# Requires a production build in dist/ (run `npm run build` first).
# Starts its own preview server so the temporary test-login helper is
# visible to the static server, then removes it on exit.

$ErrorActionPreference = 'Stop'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$root = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $root 'dist'
$port = 4180
$base = "http://localhost:$port"
$helper = Join-Path $dist 'test-login.html'
$out = Join-Path $env:TEMP 'parksure-smoke-dom.html'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw 'dist/index.html is missing. Run `npm run build` first.'
}

$helperHtml = @'
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>ParkSure test login</title></head>
  <body>
    <script>
      const params = new URLSearchParams(location.search)
      if (params.get('fresh') === '1') {
        localStorage.removeItem('parksure.session.v1')
      } else {
        localStorage.setItem(
          'parksure.session.v1',
          JSON.stringify({
            userId: params.get('user') || 'u_driver',
            activeRole: params.get('role') || 'driver',
            remember: true,
            lastActivity: Date.now(),
          }),
        )
      }
      location.replace(params.get('to') || '/')
    </script>
  </body>
</html>
'@
Set-Content -Path $helper -Value $helperHtml -Encoding utf8

$server = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', "npx vite preview --port $port --strictPort" `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden

try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i += 1) {
    Start-Sleep -Milliseconds 500
    try {
      $response = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      # server still starting
    }
  }
  if (-not $ready) { throw "Preview server did not start on port $port." }

  function Test-Route {
    param(
      [string]$Name,
      [string]$User,
      [string]$Role,
      [string]$Path,
      [string]$Expected,
      [switch]$Fresh
    )

    # A fresh profile per route prevents the PWA service worker from
    # intercepting test-login.html and serving the app shell instead.
    $profile = Join-Path $env:TEMP ("parksure-smoke-" + [guid]::NewGuid().ToString('N'))
    $freshParam = if ($Fresh) { '&fresh=1' } else { '' }
    $url = "$base/test-login.html?user=$User&role=$Role&to=$([uri]::EscapeDataString($Path))$freshParam"

    try {
      & $chrome --headless=new --disable-gpu --no-sandbox --user-data-dir=$profile --virtual-time-budget=8000 --dump-dom $url 2>$null | Out-File -Encoding utf8 $out
      $html = Get-Content $out -Raw
      if ($html -match $Expected) {
        Write-Output "PASS  $Name  ($Path)"
      } else {
        $reason = if ($html -match 'This bay does') { 'rendered NotFound' } else { 'missing expected text' }
        Write-Output "FAIL  $Name  ($Path)  expected='$Expected'  ($reason)"
      }
    } finally {
      Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
    }
  }

  Test-Route 'Landing (signed out)' 'u_driver'  'driver'    '/'                       'Park without'          -Fresh
  Test-Route 'Privacy policy'     'u_driver'    'driver'    '/privacy'                'Privacy policy'
  Test-Route 'Terms'              'u_driver'    'driver'    '/terms'                  'Terms and conditions'
  Test-Route 'Sign in'            'u_driver'    'driver'    '/sign-in'                'Park without'
  Test-Route 'Register'           'u_driver'    'driver'    '/register'               'Create your driver account'
  Test-Route 'Role chooser'       'u_driver'    'driver'    '/choose-role'            'How are you parking today'
  Test-Route 'Driver find'        'u_driver'    'driver'    '/driver/find'            'Where to,|Kolkata'
  Test-Route 'Driver place'       'u_driver'    'driver'    '/driver/place/central'   'Park Street Centre'
  Test-Route 'Driver book'        'u_driver'    'driver'    '/driver/book/central'    'Book a bay'
  Test-Route 'Driver trip'        'u_driver'    'driver'    '/driver/trip'            'Your trips|Your live parking pass'
  Test-Route 'Driver wallet'      'u_driver'    'driver'    '/driver/wallet'          'Payments &amp; passes|Payments & passes'
  Test-Route 'Driver me'          'u_driver'    'driver'    '/driver/me'              'Vehicles'
  Test-Route 'Driver support'     'u_driver'    'driver'    '/driver/support'         'ParkSure Assist'
  Test-Route 'Attendant gate'     'u_attendant' 'attendant' '/attendant/gate'         'One decision at a time'
  Test-Route 'Attendant me'       'u_attendant' 'attendant' '/attendant/me'           'Preferences'
  Test-Route 'Attendant support'  'u_attendant' 'attendant' '/attendant/support'      'ParkSure Assist'
  Test-Route 'Operator lot'       'u_operator'  'operator'  '/operator/lot'           'Live bay state'
  Test-Route 'Operator alerts'    'u_operator'  'operator'  '/operator/alerts'        'Exceptions queue'
  Test-Route 'Operator log'       'u_operator'  'operator'  '/operator/log'           'Event trail'
  Test-Route 'Operator cash'      'u_operator'  'operator'  '/operator/cash'          'Reconciliation'
  Test-Route 'Operator me'        'u_operator'  'operator'  '/operator/me'            'Preferences'
  Test-Route 'Operator support'   'u_operator'  'operator'  '/operator/support'       'ParkSure Assist'
  Test-Route 'Admin settings'     'u_admin'     'admin'     '/admin/settings'         'Administration'
  Test-Route 'Admin analytics'    'u_admin'     'admin'     '/admin/analytics'        'Usage analytics'
  Test-Route 'Admin audit log'    'u_admin'     'admin'     '/admin/log'              'Audit trail'
  Test-Route 'Admin me'           'u_admin'     'admin'     '/admin/me'               'Preferences'
  Test-Route 'Admin support'      'u_admin'     'admin'     '/admin/support'          'ParkSure Assist'
  Test-Route 'Not found'          'u_driver'    'driver'    '/does-not-exist'         'This bay does'
} finally {
  if ($server -and -not $server.HasExited) {
    & taskkill /PID $server.Id /T /F 2>$null | Out-Null
  }
  Remove-Item -Force $helper -ErrorAction SilentlyContinue
}
