Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-LogoMark($g, [float]$x, [float]$y, [float]$side) {
  $radius = [float]($side * 0.30)
  $path = New-RoundedRectPath $x $y $side $side $radius
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($x, $y)),
    (New-Object System.Drawing.PointF(($x + $side), ($y + $side))),
    [System.Drawing.Color]::FromArgb(244, 215, 145),
    [System.Drawing.Color]::FromArgb(174, 128, 41)
  )
  $g.FillPath($brush, $path)

  $glossPath = New-RoundedRectPath $x $y $side ([float]($side * 0.5)) ([float]($radius * 0.8))
  $glossBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($x, $y)),
    (New-Object System.Drawing.PointF($x, ($y + $side * 0.55))),
    [System.Drawing.Color]::FromArgb(110, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255)
  )
  $g.FillPath($glossBrush, $glossPath)

  $font = New-Object System.Drawing.Font('Segoe UI', [float]($side * 0.60), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(23, 19, 10))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF($x, ([float]($y - $side * 0.015)), $side, $side)
  $g.DrawString('P', $font, $textBrush, $rect, $sf)

  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 23, 19, 10))
  $dot = [float]($side * 0.046)
  $g.FillEllipse($dotBrush, [float]($x + $side * 0.74), [float]($y + $side * 0.17), $dot, $dot)

  $path.Dispose()
  $brush.Dispose()
  $glossPath.Dispose()
  $glossBrush.Dispose()
  $font.Dispose()
  $textBrush.Dispose()
  $dotBrush.Dispose()
  $sf.Dispose()
}

function New-Icon([int]$size, [string]$outPath, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::FromArgb(11, 11, 15))

  if ($maskable) { $side = [float]($size * 0.62) } else { $side = [float]($size * 0.86) }
  $x = [float](($size - $side) / 2)
  $y = [float](($size - $side) / 2)
  Draw-LogoMark $g $x $y $side

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Add-Glow($g, [float]$cx, [float]$cy, [float]$radius, [System.Drawing.Color]$color) {
  for ($i = 8; $i -ge 1; $i--) {
    $r = $radius * ($i / 8)
    $alpha = [int]($color.A * (1 - ($i / 9)))
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B))
    $g.FillEllipse($brush, ($cx - $r), ($cy - $r), ($r * 2), ($r * 2))
    $brush.Dispose()
  }
}

function New-OgImage([string]$outPath) {
  $w = 1200
  $h = 630
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::FromArgb(11, 11, 15))

  Add-Glow $g 1010 70 520 ([System.Drawing.Color]::FromArgb(70, 232, 194, 106))
  Add-Glow $g 130 560 440 ([System.Drawing.Color]::FromArgb(55, 124, 92, 255))

  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(18, 255, 255, 255), 1)
  for ($x = 60; $x -lt $w; $x += 60) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
  for ($y = 60; $y -lt $h; $y += 60) { $g.DrawLine($gridPen, 0, $y, $w, $y) }
  $gridPen.Dispose()

  Draw-LogoMark $g 78 70 96

  $brandFont = New-Object System.Drawing.Font('Segoe UI', 42, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brandBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(246, 244, 238))
  $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232, 194, 106))
  $g.DrawString('Park', $brandFont, $brandBrush, 194, 92)
  $parkWidth = $g.MeasureString('Park', $brandFont).Width
  $g.DrawString('Sure', $brandFont, $accentBrush, (194 + $parkWidth - 4), 92)

  $badgeFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $badgeText = 'KOLKATA  ·  SMART PARKING DEMO'
  $badgeSize = $g.MeasureString($badgeText, $badgeFont)
  $badgePath = New-RoundedRectPath 78 196 ([float]($badgeSize.Width + 34)) 40 20
  $badgeFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 232, 194, 106))
  $g.FillPath($badgeFill, $badgePath)
  $badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 232, 194, 106), 1)
  $g.DrawPath($badgePen, $badgePath)
  $g.DrawString($badgeText, $badgeFont, $accentBrush, 95, 207)

  $headlineFont = New-Object System.Drawing.Font('Segoe UI', 82, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString('Park without', $headlineFont, $brandBrush, 74, 268)
  $g.DrawString('the wait.', $headlineFont, $accentBrush, 74, 352)

  $subFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(178, 176, 188))
  $g.DrawString('Live bays, dynamic prices, maps, booking and GST receipts.', $subFont, $mutedBrush, 78, 462)
  $g.DrawString('One account. Four workspaces. Web, PWA and Android.', $subFont, $mutedBrush, 78, 498)

  $chipFont = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $chips = @('Live availability', 'Dynamic pricing', 'UPI · FASTag', 'On-device assist')
  $cx = 78
  foreach ($chip in $chips) {
    $size = $g.MeasureString($chip, $chipFont)
    $cw = [float]($size.Width + 30)
    $chipPath = New-RoundedRectPath $cx 552 $cw 38 19
    $chipFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
    $g.FillPath($chipFill, $chipPath)
    $chipPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 255, 255, 255), 1)
    $g.DrawPath($chipPen, $chipPath)
    $g.DrawString($chip, $chipFont, $brandBrush, ($cx + 15), 561)
    $cx += $cw + 12
    $chipPath.Dispose(); $chipFill.Dispose(); $chipPen.Dispose()
  }

  $demoFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $demoSize = $g.MeasureString('Demo mode: simulated data', $demoFont)
  $g.DrawString('Demo mode: simulated data', $demoFont, $mutedBrush, ($w - $demoSize.Width - 78), 566)

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $brandFont.Dispose(); $brandBrush.Dispose(); $accentBrush.Dispose(); $badgeFont.Dispose()
  $badgePath.Dispose(); $badgeFill.Dispose(); $badgePen.Dispose(); $headlineFont.Dispose()
  $subFont.Dispose(); $mutedBrush.Dispose(); $chipFont.Dispose(); $demoFont.Dispose()
  $g.Dispose()
  $bmp.Dispose()
}

$public = Join-Path $PSScriptRoot '..\public'
New-Item -ItemType Directory -Force -Path $public | Out-Null

New-Icon 32 (Join-Path $public 'favicon-32.png') $false
New-Icon 180 (Join-Path $public 'apple-touch-icon.png') $false
New-OgImage (Join-Path $public 'og-image.png')

Write-Output 'Brand assets generated: favicon-32.png, apple-touch-icon.png, og-image.png'
