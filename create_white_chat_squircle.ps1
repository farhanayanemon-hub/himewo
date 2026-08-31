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
$path.AddArc(24, 24, 160, 160, 180, 90)
# Top-Right Arc
$path.AddArc(216, 24, 160, 160, 270, 90)
# Bottom-Right Arc
$path.AddArc(216, 184, 160, 160, 0, 90)

# Bottom Line to Speech Tail
$path.AddLine(216, 344, 130, 344)
# Speech Tail pointing down-left (Messenger Style)
$path.AddLine(130, 344, 40, 388)
$path.AddLine(40, 388, 70, 344)
# Bottom-Left Arc up to top-left
$path.AddArc(24, 184, 160, 160, 90, 90)
$path.CloseFigure()

# 1. Fill Dark Base Background
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$g.FillPath($bgBrush, $path)

# 2. Draw Zoomed Pixel Cat inside the clipped Messenger Squircle
$g.SetClip($path)
$g.DrawImage($zoomedBmp, (New-Object System.Drawing.Rectangle(24, 24, 352, 330)))
$g.ResetClip()

# 3. PURE CLEAN SOLID FULL WHITE BORDER (No colorful gradient, 100% Clean White #FFFFFF)
$penWhite = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255), 10)
$g.DrawPath($penWhite, $path)

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outPath = Join-Path $outDir "original_user_pixel_cat_chat_white_squircle.png"
$chatSquircleBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created Clean Full White Messenger Squircle Logo: $outPath"

$g.Dispose()
$chatSquircleBmp.Dispose()
$zoomedBmp.Dispose()
