# ParkSure mobile overflow check.
# Requires a production build in dist/ (run `npm run build` first).
# Loads every route in a 390px and 320px iframe and fails if the page can
# scroll horizontally or a tappable control sticks out past the viewport.
# Starts its own preview server on an isolated port.

$ErrorActionPreference = 'Stop'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$root = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $root 'dist'
$port = 4181
$base = "http://localhost:$port"
$harness = Join-Path $dist 'mobile-check.html'
$out = Join-Path $env:TEMP 'parksure-mobile-dom.html'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  throw 'dist/index.html is missing. Run `npm run build` first.'
}

$routes = @(
  @{ Name = 'Landing'; User = 'u_driver'; Role = 'driver'; Path = '/'; Fresh = $true },
  @{ Name = 'Privacy'; User = 'u_driver'; Role = 'driver'; Path = '/privacy' },
  @{ Name = 'Terms'; User = 'u_driver'; Role = 'driver'; Path = '/terms' },
  @{ Name = 'Sign in'; User = 'u_driver'; Role = 'driver'; Path = '/sign-in' },
  @{ Name = 'Register'; User = 'u_driver'; Role = 'driver'; Path = '/register' },
  @{ Name = 'Role chooser'; User = 'u_driver'; Role = 'driver'; Path = '/choose-role' },
  @{ Name = 'Driver find'; User = 'u_driver'; Role = 'driver'; Path = '/driver/find' },
  @{ Name = 'Driver place'; User = 'u_driver'; Role = 'driver'; Path = '/driver/place/central' },
  @{ Name = 'Driver book'; User = 'u_driver'; Role = 'driver'; Path = '/driver/book/central' },
  @{ Name = 'Driver trip'; User = 'u_driver'; Role = 'driver'; Path = '/driver/trip' },
  @{ Name = 'Driver wallet'; User = 'u_driver'; Role = 'driver'; Path = '/driver/wallet' },
  @{ Name = 'Driver me'; User = 'u_driver'; Role = 'driver'; Path = '/driver/me' },
  @{ Name = 'Driver support'; User = 'u_driver'; Role = 'driver'; Path = '/driver/support' },
  @{ Name = 'Attendant gate'; User = 'u_attendant'; Role = 'attendant'; Path = '/attendant/gate' },
  @{ Name = 'Attendant me'; User = 'u_attendant'; Role = 'attendant'; Path = '/attendant/me' },
  @{ Name = 'Attendant support'; User = 'u_attendant'; Role = 'attendant'; Path = '/attendant/support' },
  @{ Name = 'Operator lot'; User = 'u_operator'; Role = 'operator'; Path = '/operator/lot' },
  @{ Name = 'Operator alerts'; User = 'u_operator'; Role = 'operator'; Path = '/operator/alerts' },
  @{ Name = 'Operator log'; User = 'u_operator'; Role = 'operator'; Path = '/operator/log' },
  @{ Name = 'Operator cash'; User = 'u_operator'; Role = 'operator'; Path = '/operator/cash' },
  @{ Name = 'Operator me'; User = 'u_operator'; Role = 'operator'; Path = '/operator/me' },
  @{ Name = 'Operator support'; User = 'u_operator'; Role = 'operator'; Path = '/operator/support' },
  @{ Name = 'Admin settings'; User = 'u_admin'; Role = 'admin'; Path = '/admin/settings' },
  @{ Name = 'Admin analytics'; User = 'u_admin'; Role = 'admin'; Path = '/admin/analytics' },
  @{ Name = 'Admin audit log'; User = 'u_admin'; Role = 'admin'; Path = '/admin/log' },
  @{ Name = 'Admin me'; User = 'u_admin'; Role = 'admin'; Path = '/admin/me' },
  @{ Name = 'Admin support'; User = 'u_admin'; Role = 'admin'; Path = '/admin/support' },
  @{ Name = 'Not found'; User = 'u_driver'; Role = 'driver'; Path = '/does-not-exist' }
)

$routesJson = $routes | ConvertTo-Json -Compress -Depth 4

$harnessHtml = @'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>ParkSure mobile overflow check</title>
    <style>
      body { margin: 0; font-family: ui-monospace, monospace; background: #0b0b0f; color: #f6f4ee; }
      #result { padding: 16px; white-space: pre-wrap; font-size: 13px; }
      iframe { position: absolute; left: -10000px; top: 0; border: 0; }
    </style>
  </head>
  <body>
    <div id="result">running</div>
    <script>
      const ROUTES = __ROUTES__;
      const WIDTHS = [390, 320];
      const lines = [];
      let failures = 0;

      function sessionFor(route) {
        return {
          userId: route.User,
          activeRole: route.Role,
          remember: true,
          lastActivity: Date.now(),
        };
      }

      function measure(frame, width) {
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        if (!doc || !win) return { error: 'no document' };

        const docEl = doc.documentElement;
        // innerWidth includes a classic scrollbar; mobile uses overlay
        // scrollbars, so this avoids a false 15px "overflow" on desktop Chrome.
        const viewportWidth = win.innerWidth;
        const scrollWidth = Math.max(docEl.scrollWidth, doc.body ? doc.body.scrollWidth : 0);
        const scrollOverflow = scrollWidth - viewportWidth;

        const offenders = [];
        const controls = doc.querySelectorAll('a, button, input, select, textarea, [role="button"]');
        for (const el of controls) {
          // Skip honeypots and other visually hidden controls.
          if (el.closest('[aria-hidden="true"]') || el.tabIndex === -1) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          if (rect.right > viewportWidth + 2 || rect.left < -2) {
            const label = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 32);
            const tag = el.tagName.toLowerCase();
            offenders.push(tag + (label ? ':' + label : '') + ' right=' + Math.round(rect.right));
          }
        }

        return { width, viewportWidth, scrollWidth, scrollOverflow, offenders };
      }

      function next(route, width) {
        return new Promise((resolve) => {
          if (route.Fresh) {
            localStorage.removeItem('parksure.session.v1');
          } else {
            localStorage.setItem('parksure.session.v1', JSON.stringify(sessionFor(route)));
          }
          const frame = document.createElement('iframe');
          frame.width = String(width);
          frame.height = '844';
          frame.style.width = width + 'px';
          frame.style.height = '844px';
          document.body.appendChild(frame);

          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            // Give the SPA a moment to mount after the load event.
            setTimeout(() => {
              const result = measure(frame, width);
              frame.remove();
              resolve(result);
            }, 1600);
          };

          frame.addEventListener('load', finish);
          frame.src = route.Path;
          // Safety net if the load event never fires.
          setTimeout(finish, 6000);
        });
      }

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function checkChrome() {
        const route = { User: 'u_driver', Role: 'driver', Path: '/driver/find' };
        localStorage.setItem('parksure.session.v1', JSON.stringify(sessionFor(route)));

        const frame = document.createElement('iframe');
        frame.width = '390';
        frame.height = '844';
        frame.style.width = '390px';
        frame.style.height = '844px';
        document.body.appendChild(frame);
        await new Promise((resolve) => {
          frame.addEventListener('load', resolve, { once: true });
          frame.src = route.Path;
        });
        await sleep(1800);

        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        const issues = [];

        const footer = doc.querySelector('footer');
        if (!footer) {
          issues.push('no footer');
        } else {
          const year = String(new Date().getFullYear());
          if (!footer.textContent.includes(year)) issues.push('copyright year missing');
          if (!footer.querySelector('a[href^="mailto:"]')) issues.push('email not a mailto link');
          if (!footer.querySelector('a[href^="tel:"]')) issues.push('phone not a tel link');
          const footerLinks = [...footer.querySelectorAll('a')].map((a) => a.textContent.trim());
          if (!footerLinks.includes('Privacy')) issues.push('privacy link missing');
          if (!footerLinks.includes('Terms')) issues.push('terms link missing');
          if (!footerLinks.includes('Support')) issues.push('support link missing');
        }

        const logo = doc.querySelector('header a[aria-label="ParkSure home"]');
        if (!logo) issues.push('logo is not a link');

        const menuButton = doc.querySelector('button[aria-label="Open menu"]');
        if (!menuButton) {
          issues.push('menu button missing');
        } else {
          menuButton.click();
          await sleep(700);
          const dialog = doc.querySelector('[role="dialog"]');
          const dialogText = dialog ? dialog.textContent : '';
          if (!dialog) {
            issues.push('menu did not open');
          } else {
            for (const label of ['Privacy', 'Terms', 'Sign out']) {
              if (!dialogText.includes(label)) issues.push('menu missing ' + label);
            }
            if (menuButton.getAttribute('aria-expanded') !== 'true') issues.push('menu aria-expanded not set');
          }
        }

        frame.remove();
        if (issues.length === 0) {
          lines.push('PASS  Mobile menu, footer and contact links  390px');
        } else {
          failures += 1;
          lines.push('FAIL  Mobile menu, footer and contact links  390px  ' + issues.join(' | '));
        }
      }

      (async () => {
        for (const route of ROUTES) {
          for (const width of WIDTHS) {
            let result;
            try {
              result = await next(route, width);
            } catch (error) {
              result = { error: String(error) };
            }

            if (result.error) {
              failures += 1;
              lines.push('FAIL  ' + route.Name + '  ' + width + 'px  ' + result.error);
              continue;
            }

            const issues = [];
            if (result.scrollOverflow > 1) {
              issues.push('horizontal scroll ' + result.scrollOverflow + 'px');
            }
            if (result.offenders.length > 0) {
              issues.push(result.offenders.length + ' control(s) outside: ' + result.offenders.slice(0, 4).join(', '));
            }

            if (issues.length > 0) {
              failures += 1;
              lines.push('FAIL  ' + route.Name + '  ' + width + 'px  ' + issues.join(' | '));
            } else {
              lines.push('PASS  ' + route.Name + '  ' + width + 'px');
            }
          }
        }

        await checkChrome();

        lines.push('');
        lines.push(failures === 0 ? 'All mobile overflow checks passed.' : failures + ' mobile overflow check(s) failed.');
        document.getElementById('result').textContent = lines.join('\n');
        document.title = failures === 0 ? 'MOBILE-CHECK-PASS' : 'MOBILE-CHECK-FAIL';
      })();
    </script>
  </body>
</html>
'@

Set-Content -Path $harness -Value ($harnessHtml -replace '__ROUTES__', $routesJson) -Encoding utf8

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

  $profile = Join-Path $env:TEMP ("parksure-mobile-" + [guid]::NewGuid().ToString('N'))
  try {
    & $chrome --headless=new --disable-gpu --no-sandbox --user-data-dir=$profile --virtual-time-budget=120000 --dump-dom "$base/mobile-check.html" 2>$null | Out-File -Encoding utf8 $out
    $html = Get-Content $out -Raw
    if ($html -match 'MOBILE-CHECK-PASS') {
      # Print the readable result block.
      $text = [regex]::Match($html, '<div id="result">(.*?)</div>', 'Singleline').Groups[1].Value
      $text = [System.Net.WebUtility]::HtmlDecode($text)
      Write-Output $text
      exit 0
    }
    $text = [regex]::Match($html, '<div id="result">(.*?)</div>', 'Singleline').Groups[1].Value
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    Write-Output $text
    Write-Output 'MOBILE-CHECK-FAIL'
    exit 1
  } finally {
    Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
  }
} finally {
  if ($server -and -not $server.HasExited) {
    & taskkill /PID $server.Id /T /F 2>$null | Out-Null
  }
  Remove-Item -Force $harness -ErrorAction SilentlyContinue
}
