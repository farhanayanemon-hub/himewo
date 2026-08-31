Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\original_user_pixel_cat_zoomed.png"
$zoomedBmp = [System.Drawing.Image]::FromFile($srcPath)

$w = 400
$h = 400

# Treatment 1: BOLD PROMINENT MESSENGER SQUIRCLE (Big Tail, 100% Massive Cat Scale)
$t1Bmp = New-Object System.Drawing.Bitmap($w, $h)
$g1 = [System.Drawing.Graphics]::FromImage($t1Bmp)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Construct Wide, Highly Visible Messenger Squircle
# Squircle fills X: 10 to 390, Y: 10 to 340
# Massive speech tail extends down-left: from X: 120, Y: 340 -> X: 20, Y: 395 -> X: 80, Y: 330
$path1 = New-Object System.Drawing.Drawing2D.GraphicsPath
$path1.AddArc(10, 10, 160, 160, 180, 90)
$path1.AddArc(220, 10, 160, 160, 270, 90)
$path1.AddArc(220, 170, 160, 160, 0, 90)

# Bottom edge to prominent speech tail
$path1.AddLine(220, 330, 140, 330)
# Wide Bold Speech Tail
$path1.AddLine(140, 330, 10, 395)
$path1.AddLine(10, 395, 60, 330)
$path1.AddArc(10, 170, 160, 160, 90, 90)
$path1.CloseFigure()

# Fill dark base
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$g1.FillPath($bgBrush, $path1)

# Draw Massive Zoomed Cat inside (Fills entire upper 340px)
$g1.SetClip($path1)
$g1.DrawImage($zoomedBmp, (New-Object System.Drawing.Rectangle(0, 0, 400, 340)))
$g1.ResetClip()

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$t1Path = Join-Path $outDir "chat_logo_bold_tail.png"
$t1Bmp.Save($t1Path, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created Big Bold Tail Chat Logo: $t1Path"

$g1.Dispose()
$t1Bmp.Dispose()
$zoomedBmp.Dispose()
