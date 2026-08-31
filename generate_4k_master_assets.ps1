Add-Type -AssemblyName System.Drawing

$publicDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$brandDir = Join-Path $publicDir "brand-assets"
if (!(Test-Path $brandDir)) {
    New-Item -ItemType Directory -Path $brandDir | Out-Null
}

$srcZoomed = [System.Drawing.Image]::FromFile((Join-Path $publicDir "original_user_pixel_cat_zoomed.png"))
$srcChatBubble = [System.Drawing.Image]::FromFile((Join-Path $publicDir "original_user_pixel_cat_chat_white_bubble.png"))

# 1. Generate 4K Ultra-HD Master (2048 x 2048) for Main Social App
$w4k = 2048
$h4k = 2048

$bmpMain4k = New-Object System.Drawing.Bitmap($w4k, $h4k)
$gMain = [System.Drawing.Graphics]::FromImage($bmpMain4k)
$gMain.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMain.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gMain.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gMain.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$gMain.DrawImage($srcZoomed, (New-Object System.Drawing.Rectangle(0, 0, $w4k, $h4k)))
$main4kPath = Join-Path $brandDir "himewo_main_app_logo_4k_master.png"
$bmpMain4k.Save($main4kPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created Main App 4K Master: $main4kPath"

# 2. Generate 4K Ultra-HD Master (2048 x 2048) for Chat App
$bmpChat4k = New-Object System.Drawing.Bitmap($w4k, $h4k)
$gChat = [System.Drawing.Graphics]::FromImage($bmpChat4k)
$gChat.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gChat.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gChat.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gChat.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$gChat.DrawImage($srcChatBubble, (New-Object System.Drawing.Rectangle(0, 0, $w4k, $h4k)))
$chat4kPath = Join-Path $brandDir "himewo_chat_app_logo_4k_master.png"
$bmpChat4k.Save($chat4kPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Created Chat App 4K Master: $chat4kPath"

# 3. Generate 1024 x 1024 Mobile Icon Assets
$w1k = 1024
$h1k = 1024

$bmpMain1k = New-Object System.Drawing.Bitmap($w1k, $h1k)
$gM1k = [System.Drawing.Graphics]::FromImage($bmpMain1k)
$gM1k.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gM1k.DrawImage($srcZoomed, (New-Object System.Drawing.Rectangle(0, 0, $w1k, $h1k)))

$bmpChat1k = New-Object System.Drawing.Bitmap($w1k, $h1k)
$gC1k = [System.Drawing.Graphics]::FromImage($bmpChat1k)
$gC1k.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gC1k.DrawImage($srcChatBubble, (New-Object System.Drawing.Rectangle(0, 0, $w1k, $h1k)))

# Copy to mobile app assets directories
$mobileDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\mobile\assets"
if (Test-Path $mobileDir) {
    $bmpMain1k.Save((Join-Path $mobileDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpMain1k.Save((Join-Path $mobileDir "adaptive-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpMain1k.Save((Join-Path $mobileDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Updated artifacts/mobile assets!"
}

$mobileChatDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\mobile-chat\assets"
if (Test-Path $mobileChatDir) {
    $bmpChat1k.Save((Join-Path $mobileChatDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpChat1k.Save((Join-Path $mobileChatDir "adaptive-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpChat1k.Save((Join-Path $mobileChatDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Updated artifacts/mobile-chat assets!"
}

# Also save 1024px to public/brand-assets
$bmpMain1k.Save((Join-Path $brandDir "himewo_main_app_logo_1024.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmpChat1k.Save((Join-Path $brandDir "himewo_chat_app_logo_1024.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$gMain.Dispose()
$gChat.Dispose()
$gM1k.Dispose()
$gC1k.Dispose()
$bmpMain4k.Dispose()
$bmpChat4k.Dispose()
$bmpMain1k.Dispose()
$bmpChat1k.Dispose()
$srcZoomed.Dispose()
$srcChatBubble.Dispose()

Write-Host "All High HD 4K Master Brand Files Created Successfully!"
