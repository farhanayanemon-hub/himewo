Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\brain\13b46482-b865-405a-8064-3e7af421c86e\himewo_option1_worldclass_logos_1788173657547.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)

# Source: 1376 x 768
# Concept 1 is roughly at:
# X: 155 to 345 (Width: 190)
# Y: 110 to 285 (Height: 175)
$cropX = 145
$cropY = 110
$cropW = 205
$cropH = 180

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$targetMain = New-Object System.Drawing.Bitmap($cropW, $cropH)
$gMain = [System.Drawing.Graphics]::FromImage($targetMain)
$gMain.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMain.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gMain.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$gMain.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$targetMain.Save((Join-Path $outDir "celestial_aurora_mewo.png"), [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created exact Main App Logo PNG: celestial_aurora_mewo.png"

$gMain.Dispose()
$targetMain.Dispose()
$img.Dispose()
