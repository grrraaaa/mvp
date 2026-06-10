Add-Type -AssemblyName System.Drawing
$out = "C:\Users\New\Desktop\sber\mvp\frontend\public\images\assistant\open-ai-button.png"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null

$bmp = New-Object System.Drawing.Bitmap 96, 96
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::Transparent)

# Soft shadow
$shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 33, 160, 56))
$g.FillEllipse($shadow, 6, 10, 84, 84)

# Green disc (sber-green #21A038)
$greenBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 33, 160, 56))
$g.FillEllipse($greenBrush, 4, 4, 88, 88)

# 4-point star (sparkle) white
$starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$cx = 48
$cy = 48
$g.FillRectangle($starBrush, $cx - 2, $cy - 22, 4, 44)
$g.FillRectangle($starBrush, $cx - 22, $cy - 2, 44, 4)

# Diagonal smaller rays
$diag = New-Object System.Drawing.Drawing2D.Matrix
$diag.RotateAt(45, (New-Object System.Drawing.PointF($cx, $cy)))
$g.Transform = $diag
$g.FillRectangle($starBrush, $cx - 1.5, $cy - 14, 3, 28)
$g.FillRectangle($starBrush, $cx - 14, $cy - 1.5, 28, 3)
$g.ResetTransform()

# Status indicator (emerald)
$indBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillEllipse($indBg, 70, 6, 18, 18)
$ind = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 16, 182, 122))
$g.FillEllipse($ind, 72, 8, 14, 14)

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Saved: $out"
Write-Host "Size: $((Get-Item $out).Length) bytes"
