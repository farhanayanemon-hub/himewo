Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\himewo_bubble_logos_sheet2_1788170156107.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source Sheet 2 Dimensions: $($img.Width) x $($img.Height)"

# In Sheet 2 (which contains Variation 6, 7, 8, 9, 10 in a 5-grid or 3-top 2-bottom layout):
# Let's inspect the layout and crop Variation 8.
# In a horizontal 5-column or 3x2 grid:
# In the 5-item horizontal card layout (like sheet 1 & sheet 2):
# Item 6 is at X: 0% to 20%
# Item 7 is at X: 20% to 40%
# Item 8 is at X: 40% to 60% (CENTER)
# Item 9 is at X: 60% to 80%
# Item 10 is at X: 80% to 100%

$cropX = [int]($img.Width * 0.40)
$cropY = [int]($img.Height * 0.12)
$cropW = [int]($img.Width * 0.20)
$cropH = [int]($img.Height * 0.76)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$target = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($target)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outPath = Join-Path $outDir "himewo_official_logo_variation8.png"
$target.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved Variation 8 logo to: $outPath"

$g.Dispose()
$target.Dispose()
$img.Dispose()
