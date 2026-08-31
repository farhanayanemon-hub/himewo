Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public\himewo_bubble_logos_sheet2_1788170156107.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)

# Source: 1376 x 768
# In Catalog 6 (Sheet 2 of speech bubbles):
# Variation 8 is the center design (X: 41.5% to 58.5%, Y: 32% to 66%)
$cropX = [int]($img.Width * 0.415)
$cropY = [int]($img.Height * 0.32)
$cropW = [int]($img.Width * 0.17)
$cropH = [int]($img.Height * 0.35)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$cropped = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($cropped)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

# Now, let's create a transparent PNG by keying out the background dark pixels outside the cat glyph
# The background dark color is around R < 25, G < 30, B < 40
$transparentBmp = New-Object System.Drawing.Bitmap($cropW, $cropH)

for ($x = 0; $x -lt $cropW; $x++) {
    for ($y = 0; $y -lt $cropH; $y++) {
        $pixel = $cropped.GetPixel($x, $y)
        # Check brightness and distance from dark obsidian background
        $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3.0
        
        # If it's the dark background card outside the glowing cat
        if ($pixel.R -lt 28 -and $pixel.G -lt 32 -and $pixel.B -lt 45) {
            $transparentBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Keep exact original pixel colors
            $transparentBmp.SetPixel($x, $y, $pixel)
        }
    }
}

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$outRaw = Join-Path $outDir "variation8_original_raw.png"
$outTrans = Join-Path $outDir "variation8_exact_transparent.png"

$cropped.Save($outRaw, [System.Drawing.Imaging.ImageFormat]::Png)
$transparentBmp.Save($outTrans, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created exact Variation 8 transparent PNG from the original sheet!"

$g.Dispose()
$cropped.Dispose()
$transparentBmp.Dispose()
$img.Dispose()
