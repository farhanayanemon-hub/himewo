Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\original_user_pixel_cat_zoomed.png"
$zoomedBmp = [System.Drawing.Image]::FromFile($srcPath)

$w = 400
$h = 400
$opt2Bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($opt2Bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# 1. Construct Outer Solid Pure White Messenger Speech Bubble (Symmetric 1:1 Proportion)
# Bubble squircle occupies X: 16 to 384, Y: 16 to 344
$outerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$outerPath.AddArc(16, 16, 160, 160, 180, 90)
$outerPath.AddArc(208, 16, 160, 160, 270, 90)
$outerPath.AddArc(208, 168, 160, 160, 0, 90)
$outerPath.AddLine(208, 328, 130, 328)
# Sharp Speech Tail pointing down-left
$outerPath.AddLine(130, 328, 16, 388)
$outerPath.AddLine(16, 388, 56, 310)
$outerPath.AddArc(16, 168, 160, 160, 90, 90)
$outerPath.CloseFigure()

# Fill with Solid Pure White
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
$g.FillPath($brushWhite, $outerPath)

# 2. Inner Cutout with STRICT 1:1 PERFECT SQUARE ASPECT RATIO
# Cat inner box is EXACTLY 336 x 336 (Perfect 1:1 Square - ZERO stretching or flattening)
$innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$innerPath.AddArc(32, 32, 130, 130, 180, 90)
$innerPath.AddArc(222, 32, 130, 130, 270, 90)
$innerPath.AddArc(222, 182, 130, 130, 0, 90)
$innerPath.AddLine(222, 312, 48, 312)
$innerPath.AddArc(32, 182, 130, 130, 90, 90)
$innerPath.CloseFigure()

# Draw Zoomed Cat in STRICT 1:1 PERFECT SQUARE (X: 16, Y: 0, W: 368, H: 368) -> Exactly matches Main App!
$g.SetClip($innerPath)
$g.DrawImage($zoomedBmp, (New-Object System.Drawing.Rectangle(16, 0, 368, 368)))
$g.ResetClip()

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outPath = Join-Path $outDir "original_user_pixel_cat_chat_white_bubble.png"
$opt2Bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created Fixed 1:1 Perfect Aspect Ratio Chat Logo: $outPath"

$g.Dispose()
$opt2Bmp.Dispose()
$zoomedBmp.Dispose()
