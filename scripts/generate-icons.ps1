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

function New-ParkSureIcon([int]$size, [string]$outPath, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::FromArgb(11, 11, 15))

  if ($maskable) {
    $side = [float]($size * 0.62)
  } else {
    $side = [float]($size * 0.86)
  }
  $x = [float](($size - $side) / 2)
  $y = [float](($size - $side) / 2)
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

  $fontSize = [float]($side * 0.60)
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(23, 19, 10))
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF($x, ([float]($y - $side * 0.015)), $side, $side)
  $g.DrawString('P', $font, $textBrush, $rect, $sf)

  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 23, 19, 10))
  $dot = [float]($side * 0.046)
  $g.FillEllipse($dotBrush, [float]($x + $side * 0.74), [float]($y + $side * 0.17), $dot, $dot)

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose()
  $bmp.Dispose()
  $path.Dispose()
  $glossPath.Dispose()
  $brush.Dispose()
  $glossBrush.Dispose()
  $font.Dispose()
  $textBrush.Dispose()
  $dotBrush.Dispose()
  $sf.Dispose()
}

$dir = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
New-ParkSureIcon 192 (Join-Path $dir 'icon-192.png') $false
New-ParkSureIcon 512 (Join-Path $dir 'icon-512.png') $false
New-ParkSureIcon 512 (Join-Path $dir 'icon-maskable-512.png') $true
Write-Output 'Icons generated.'
