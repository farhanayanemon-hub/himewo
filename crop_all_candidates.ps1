Add-Type -AssemblyName System.Drawing

$publicDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"

# 1. Crop Concept 5 (Golden Ratio Monoline Cat) from World-Class Sheet (1376x768)
# Concept 5 is at bottom center (X: 38% to 62%, Y: 56% to 92%)
$sheetWorld = [System.Drawing.Image]::FromFile((Join-Path $publicDir "himewo_option1_worldclass_logos_1788173657547.jpg"))

$cropW5 = [int]($sheetWorld.Width * 0.28)
$cropH5 = [int]($sheetWorld.Height * 0.38)
$cropX5 = [int]($sheetWorld.Width * 0.36)
$cropY5 = [int]($sheetWorld.Height * 0.54)

$target5 = New-Object System.Drawing.Bitmap($cropW5, $cropH5)
$g5 = [System.Drawing.Graphics]::FromImage($target5)
$g5.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g5.DrawImage($sheetWorld, (New-Object System.Drawing.Rectangle(0, 0, $cropW5, $cropH5)), (New-Object System.Drawing.Rectangle($cropX5, $cropY5, $cropW5, $cropH5)), [System.Drawing.GraphicsUnit]::Pixel)
$target5.Save((Join-Path $publicDir "original_concept5_monoline.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g5.Dispose()
$target5.Dispose()

# 2. Crop Logo 4 (Minimalist Silhouette) from Sheet 1 (1376x768)
# Logo 4 is at bottom left-center
$sheet1 = [System.Drawing.Image]::FromFile((Join-Path $publicDir "himewo_10_logos_sheet1_1788169950345.jpg"))
$cropW4 = [int]($sheet1.Width * 0.26)
$cropH4 = [int]($sheet1.Height * 0.38)
$cropX4 = [int]($sheet1.Width * 0.36)
$cropY4 = [int]($sheet1.Height * 0.54)

$target4 = New-Object System.Drawing.Bitmap($cropW4, $cropH4)
$g4 = [System.Drawing.Graphics]::FromImage($target4)
$g4.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g4.DrawImage($sheet1, (New-Object System.Drawing.Rectangle(0, 0, $cropW4, $cropH4)), (New-Object System.Drawing.Rectangle($cropX4, $cropY4, $cropW4, $cropH4)), [System.Drawing.GraphicsUnit]::Pixel)
$target4.Save((Join-Path $publicDir "original_logo4_silhouette.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g4.Dispose()
$target4.Dispose()

# 3. Crop Logo 9 (Golden Ratio Feline) from Sheet 2
$sheet2 = [System.Drawing.Image]::FromFile((Join-Path $publicDir "himewo_10_logos_sheet2_1788169973550.jpg"))
$cropW9 = [int]($sheet2.Width * 0.26)
$cropH9 = [int]($sheet2.Height * 0.38)
$cropX9 = [int]($sheet2.Width * 0.36)
$cropY9 = [int]($sheet2.Height * 0.54)

$target9 = New-Object System.Drawing.Bitmap($cropW9, $cropH9)
$g9 = [System.Drawing.Graphics]::FromImage($target9)
$g9.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g9.DrawImage($sheet2, (New-Object System.Drawing.Rectangle(0, 0, $cropW9, $cropH9)), (New-Object System.Drawing.Rectangle($cropX9, $cropY9, $cropW9, $cropH9)), [System.Drawing.GraphicsUnit]::Pixel)
$target9.Save((Join-Path $publicDir "original_logo9_golden_ratio.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g9.Dispose()
$target9.Dispose()

$sheetWorld.Dispose()
$sheet1.Dispose()
$sheet2.Dispose()

Write-Host "Successfully cropped all original logo candidates!"
