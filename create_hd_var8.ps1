Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\himewo_bubble_logos_sheet2_1788170156107.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)

# We want the exact Variation 8 card from Sheet 2 (which is the center card)
# Center card in Sheet 2:
# Width of card is about 230px, Height is about 320px in a 1376x768 sheet
$cropX = [int]($img.Width * 0.405)
$cropY = [int]($img.Height * 0.22)
$cropW = [int]($img.Width * 0.19)
$cropH = [int]($img.Height * 0.48)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)

# Scale up 2X for ultra-HD crystal sharpness (520x680)
$targetW = $cropW * 2
$targetH = $cropH * 2

$targetHD = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($targetHD)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$targetHD.Save((Join-Path $outDir "variation8_hd_original.png"), [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created flawless HD Variation 8 original image: variation8_hd_original.png"

$g.Dispose()
$targetHD.Dispose()
$img.Dispose()
