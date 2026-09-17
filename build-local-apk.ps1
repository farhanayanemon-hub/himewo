param(
  [ValidateSet("chat", "social", "both")]
  [string]$App = "chat",
  [switch]$Publish
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "       HiMewo Local Android APK Builder       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Environment verification
if (-not $env:ANDROID_HOME) {
  $defaultSdk = "$env:LOCALAPPDATA\Android\Sdk"
  if (Test-Path $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    Write-Host "[OK] Detected Android SDK: $env:ANDROID_HOME" -ForegroundColor Green
  } else {
    Write-Error "ANDROID_HOME environment variable is not set and SDK not found at $defaultSdk."
    exit 1
  }
}

$buildTools = Get-ChildItem "$env:ANDROID_HOME\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
if (-not $buildTools) {
  Write-Error "No Android build-tools found in $env:ANDROID_HOME\build-tools."
  exit 1
}
$apksigner = Join-Path $buildTools.FullName "apksigner.bat"
Write-Host "[OK] Using Android build-tools: $($buildTools.Name)" -ForegroundColor Green

if (-not (Test-Path "$repoRoot\downloads")) {
  New-Item -ItemType Directory -Path "$repoRoot\downloads" | Out-Null
}

function Build-TargetApp([string]$target) {
  if ($target -eq "chat") {
    $appDir = "$repoRoot\artifacts\mobile-chat"
    $ksFile = "$repoRoot\chat-release.keystore"
    $ksJsonFile = "$repoRoot\chat-release.keystore.json"
    $outName = "himewo-chat.apk"
    $pkgName = "@workspace/mobile-chat"
  } else {
    $appDir = "$repoRoot\artifacts\mobile"
    $ksFile = "$repoRoot\social-release.keystore"
    $ksJsonFile = "$repoRoot\social-release.keystore.json"
    $outName = "himewo-social.apk"
    $pkgName = "@workspace/mobile"
  }

  Write-Host "`n>>> [1/4] Prebuilding $target native project..." -ForegroundColor Yellow
  $env:EXPO_PUBLIC_DOMAIN = "workspaceapi-server-production-5e99.up.railway.app"
  $env:EXPO_PUBLIC_SUPABASE_URL = "https://rzdfgbfyhnkvqbcegguk.supabase.co"
  $env:EXPO_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZGZnYmZ5aG5rdnFiY2VnZ3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDgwODMsImV4cCI6MjA5Nzk4NDA4M30.8RlmkHFpDxDGmZ1KJg3bnswfy6my8FRT0Su_F1fu5CU"
  
  Set-Location $appDir
  pnpm exec expo prebuild --platform android --no-install --clean

  Write-Host "`n>>> [2/4] Compiling release APK with Gradle..." -ForegroundColor Yellow
  Set-Location "$appDir\android"
  cmd.exe /c "gradlew.bat assembleRelease --no-daemon -Dorg.gradle.jvmargs=""-Xmx4096m -XX:MaxMetaspaceSize=1024m"""

  $unsigned = Get-ChildItem "$appDir\android\app\build\outputs\apk\release\*.apk" | Select-Object -First 1
  if (-not $unsigned) {
    Write-Error "Gradle did not produce an APK in $appDir\android\app\build\outputs\apk\release!"
    exit 1
  }

  Write-Host "`n>>> [3/4] Signing APK with $target release keystore..." -ForegroundColor Yellow
  $ksJson = Get-Content $ksJsonFile | ConvertFrom-Json
  $destApk = "$repoRoot\downloads\$outName"

  & $apksigner sign `
    --ks $ksFile `
    --ks-key-alias $ksJson.keyAlias `
    --ks-pass "pass:$($ksJson.keystorePassword)" `
    --key-pass "pass:$($ksJson.keyPassword)" `
    --out $destApk `
    $unsigned.FullName

  Write-Host "[OK] Verifying signed APK..." -ForegroundColor Green
  & $apksigner verify --verbose $destApk

  $apkSize = [math]::Round(((Get-Item $destApk).Length / 1MB), 2)
  Write-Host "[SUCCESS] $outName generated at $destApk ($apkSize MB)" -ForegroundColor Green

  if ($Publish) {
    Write-Host "`n>>> [4/4] Publishing $outName to GitHub Releases..." -ForegroundColor Yellow
    Set-Location $repoRoot
    if (-not $env:GITHUB_TOKEN -and (Test-Path "$repoRoot\.env")) {
      Get-Content "$repoRoot\.env" | ForEach-Object {
        if ($_ -match "^GITHUB_TOKEN=(.*)$") { $env:GITHUB_TOKEN = $matches[1].Trim() }
      }
    }
    node scripts/publish-release.mjs $destApk $outName "v1.2.0"
  }
}

if ($App -eq "chat" -or $App -eq "both") {
  Build-TargetApp "chat"
}
if ($App -eq "social" -or $App -eq "both") {
  Build-TargetApp "social"
}

Set-Location $repoRoot
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "       All requested builds completed!       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
