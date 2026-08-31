Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\himewo_bubble_logos_sheet2_1788170156107.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)

# Source: 1376 x 768
# Card 8 is roughly X: 41% to 59%, Y: 30% to 70%
# Let's crop just the icon emblem of Variation 8
$cropX = [int]($img.Width * 0.42)
$cropY = [int]($img.Height * 0.32)
$cropW = [int]($img.Width * 0.16)
$cropH = [int]($img.Height * 0.36)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$target = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($target)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outPath = Join-Path $outDir "variation8_icon_emblem.png"
$target.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved tight crop of Variation 8 icon emblem to: $outPath"

$g.Dispose()
$target.Dispose()
$img.Dispose()
