Add-Type -AssemblyName System.Drawing

$publicDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$mainMasterPath = Join-Path $publicDir "brand-assets\himewo_main_app_logo_1024.png"
$chatMasterPath = Join-Path $publicDir "brand-assets\himewo_chat_app_logo_1024.png"

$mainImg = [System.Drawing.Image]::FromFile($mainMasterPath)
$chatImg = [System.Drawing.Image]::FromFile($chatMasterPath)

# 1. Update Mobile Social App Assets (all folders)
$mobileDirs = @(
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\mobile\assets",
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\mobile\assets\images"
)

foreach ($dir in $mobileDirs) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $mainImg.Save((Join-Path $dir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $mainImg.Save((Join-Path $dir "adaptive-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $mainImg.Save((Join-Path $dir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $mainImg.Save((Join-Path $dir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $mainImg.Save((Join-Path $dir "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Updated $dir with Main App Icons!"
}

# 2. Update Mobile Chat App Assets (all folders)
$chatDirs = @(
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\mobile-chat\assets",
    "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\mobile-chat\assets\images"
)

foreach ($dir in $chatDirs) {
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $chatImg.Save((Join-Path $dir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $chatImg.Save((Join-Path $dir "adaptive-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $chatImg.Save((Join-Path $dir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $chatImg.Save((Join-Path $dir "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $chatImg.Save((Join-Path $dir "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Updated $dir with Chat App Icons!"
}

# 3. Update Web Public root icons
$mainImg.Save((Join-Path $publicDir "logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$mainImg.Save((Join-Path $publicDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$mainImg.Save((Join-Path $publicDir "apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$chatImg.Save((Join-Path $publicDir "chat-logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$chatImg.Save((Join-Path $publicDir "chat-favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$mainImg.Dispose()
$chatImg.Dispose()

Write-Host "All Mobile and Web App Icons & Logos Successfully Synced Across the Whole Ecosystem!"
