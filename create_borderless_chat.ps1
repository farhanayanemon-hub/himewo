Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\original_user_pixel_cat_zoomed.png"
$zoomedBmp = [System.Drawing.Image]::FromFile($srcPath)

$w = 400
$h = 400
$chatSquircleBmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($chatSquircleBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Construct Messenger-style Rounded Square (Squircle) with Speech Bubble Tail
$path = New-Object System.Drawing.Drawing2D.GraphicsPath

# Top-Left Arc
$path.AddArc(16, 16, 170, 170, 180, 90)
# Top-Right Arc
$path.AddArc(214, 16, 170, 170, 270, 90)
# Bottom-Right Arc
$path.AddArc(214, 184, 170, 170, 0, 90)

# Bottom Line to Speech Tail
$path.AddLine(214, 354, 120, 354)
# Speech Tail pointing down-left (Messenger Style)
$path.AddLine(120, 354, 28, 392)
$path.AddLine(28, 392, 60, 354)
# Bottom-Left Arc up to top-left
$path.AddArc(16, 184, 170, 170, 90, 90)
$path.CloseFigure()

# 1. Fill Dark Base Background
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$g.FillPath($bgBrush, $path)

# 2. Draw Zoomed Pixel Cat inside the clipped Messenger Squircle (NO BORDER)
$g.SetClip($path)
$g.DrawImage($zoomedBmp, (New-Object System.Drawing.Rectangle(0, 0, 400, 360)))
$g.ResetClip()

# NO BORDER DRAWN! PURE BORDERLESS!

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outPath = Join-Path $outDir "original_user_pixel_cat_chat_borderless.png"
$chatSquircleBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created 100% BORDERLESS Messenger Squircle Logo: $outPath"

$g.Dispose()
$chatSquircleBmp.Dispose()
$zoomedBmp.Dispose()
