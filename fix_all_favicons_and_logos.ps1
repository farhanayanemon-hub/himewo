Add-Type -AssemblyName System.Drawing

$webPublic = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$catMasterPath = Join-Path $webPublic "original_user_pixel_cat_zoomed.png"
$catBmp = [System.Drawing.Bitmap]::FromFile($catMasterPath)

# 1. Generate Crisp Favicon PNG (64x64)
$favBmp = New-Object System.Drawing.Bitmap(64, 64)
$gFav = [System.Drawing.Graphics]::FromImage($favBmp)
$gFav.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFav.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gFav.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gFav.DrawImage($catBmp, (New-Object System.Drawing.Rectangle(0, 0, 64, 64)))

# Base64 string for SVG embedding
$ms = New-Object System.IO.MemoryStream
$favBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$b64Png = [Convert]::ToBase64String($ms.ToArray())
$ms.Dispose()

# Create Crisp SVG Favicon
$svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64" width="64" height="64">
  <image width="64" height="64" xlink:href="data:image/png;base64,$b64Png" />
</svg>
"@

# List of all public directories to sync
$targetDirs = @(
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public",
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\ads-dashboard\public",
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\admin\public",
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\app-landing\public"
)

foreach ($dir in $targetDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
    
    # Save Favicon PNG
    $favPath = Join-Path $dir "favicon.png"
    $favBmp.Save($favPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Save Favicon ICO
    $icoPath = Join-Path $dir "favicon.ico"
    $favBmp.Save($icoPath, [System.Drawing.Imaging.ImageFormat]::Icon)
    
    # Save Favicon SVG
    $svgPath = Join-Path $dir "favicon.svg"
    [System.IO.File]::WriteAllText($svgPath, $svgContent)
    
    # Save apple-touch-icon
    $applePath = Join-Path $dir "apple-touch-icon.png"
    $favBmp.Save($applePath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Save full logo.png
    $logoPath = Join-Path $dir "logo.png"
    $catBmp.Save($logoPath, [System.Drawing.Imaging.ImageFormat]::Png)

    Write-Host "Synced Favicons and Logos to: $dir"
}

$gFav.Dispose()
$favBmp.Dispose()
$catBmp.Dispose()

Write-Host "All Favicons and Logo Assets Successfully Updated!"
