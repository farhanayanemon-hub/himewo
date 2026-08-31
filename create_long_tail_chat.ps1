Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\original_user_pixel_cat_zoomed.png"
$zoomedBmp = [System.Drawing.Image]::FromFile($srcPath)

$w = 420
$h = 420
$tLongBmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($tLongBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Construct Squircle with Extended Long Speech Tail
# Upper body squircle fills X: 20 to 410, Y: 10 to 320
# Long speech tail extends far down-left to X: 0, Y: 415
$path = New-Object System.Drawing.Drawing2D.GraphicsPath

# Top-Left Arc
$path.AddArc(20, 10, 160, 160, 180, 90)
# Top-Right Arc
$path.AddArc(230, 10, 160, 160, 270, 90)
# Bottom-Right Arc
$path.AddArc(230, 150, 160, 160, 0, 90)

# Bottom line leading to the elongated speech tail
$path.AddLine(230, 310, 150, 310)

# ELONGATED LONG SPEECH TAIL: Extends gracefully down-left to (0, 415)
$path.AddLine(150, 310, 0, 415)
$path.AddLine(0, 415, 60, 305)

# Bottom-Left Arc up to top
$path.AddArc(20, 150, 160, 160, 90, 90)
$path.CloseFigure()

# Fill dark base
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$g.FillPath($bgBrush, $path)

# Draw Full-Scale Zoomed Cat inside (Fills the entire upper body)
$g.SetClip($path)
$g.DrawImage($zoomedBmp, (New-Object System.Drawing.Rectangle(10, 0, 400, 320)))
$g.ResetClip()

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outPath = Join-Path $outDir "original_user_pixel_cat_chat_long_tail.png"
$tLongBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created Elongated Long-Tail Chat Logo: $outPath"

$g.Dispose()
$tLongBmp.Dispose()
$zoomedBmp.Dispose()
