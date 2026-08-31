Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\brain\13b46482-b865-405a-8064-3e7af421c86e\.user_uploaded\media_1788170262464.jpg"
$img = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Source Image Dimensions: $($img.Width) x $($img.Height)"

# 1. TIGHT ZOOMED CROP of the Cat (Zoom in ~1.4X to fill frame boldly)
# Focus directly on the black pixel cat
$zoomW = [int]($img.Width * 0.72)
$zoomH = [int]($img.Height * 0.72)
$zoomX = [int](($img.Width - $zoomW) / 2)
$zoomY = [int](($img.Height - $zoomH) / 2)

$zoomedBmp = New-Object System.Drawing.Bitmap(400, 400)
$gZoom = [System.Drawing.Graphics]::FromImage($zoomedBmp)
$gZoom.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gZoom.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gZoom.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$gZoom.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, 400, 400)), (New-Object System.Drawing.Rectangle($zoomX, $zoomY, $zoomW, $zoomH)), [System.Drawing.GraphicsUnit]::Pixel)

$outDir = "C:\Users\Farhan Ayan Emon\.gemini\antigravity-ide\scratch\himewo\artifacts\web\public"
$zoomedPath = Join-Path $outDir "original_user_pixel_cat_zoomed.png"
$zoomedBmp.Save($zoomedPath, [System.Drawing.Imaging.ImageFormat]::Png)
$zoomedBmp.Save((Join-Path $outDir "original_user_pixel_cat.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$zoomedBmp.Save((Join-Path $outDir "original_user_pixel_cat.png"), [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved Zoomed Cat Logo to: $zoomedPath"

# 2. CHAT APP CIRCLE EDITION
# Circular Badge with Speech Bubble Tail and Glowing Aurora Ring
$chatBmp = New-Object System.Drawing.Bitmap(400, 400)
$gChat = [System.Drawing.Graphics]::FromImage($chatBmp)
$gChat.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gChat.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Circular Path Clip for the cat inside
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(20, 20, 360, 360)

# Draw dark base
$brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$gChat.FillEllipse($brushBg, 20, 20, 360, 360)

# Draw Zoomed Cat clipped inside circle
$gChat.SetClip($path)
$gChat.DrawImage($zoomedBmp, (New-Object System.Drawing.Rectangle(20, 20, 360, 360)))
$gChat.ResetClip()

# Draw Glowing Aurora Border Ring around the circle (12px)
$penRing = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(168, 85, 247), 14)
$gChat.DrawEllipse($penRing, 20, 20, 360, 360)

$penCyan = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(56, 189, 248), 6)
$gChat.DrawEllipse($penCyan, 20, 20, 360, 360)

# Speech Bubble Tail at bottom right
$tailPoints = @(
    (New-Object System.Drawing.Point(310, 310)),
    (New-Object System.Drawing.Point(380, 380)),
    (New-Object System.Drawing.Point(340, 280))
)
$brushTail = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
$gChat.FillPolygon($brushTail, $tailPoints)

$chatPath = Join-Path $outDir "original_user_pixel_cat_chat_circle.png"
$chatBmp.Save($chatPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved Chat Style Circle Logo to: $chatPath"

$gZoom.Dispose()
$gChat.Dispose()
$zoomedBmp.Dispose()
$chatBmp.Dispose()
$img.Dispose()
