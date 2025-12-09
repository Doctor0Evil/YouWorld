# Build the web overlay bundle on Windows PowerShell.
# This simple script concatenates generated JS stubs with overlay-client.js. For production, use a bundler.

$webJsPath = Join-Path $PSScriptRoot "..\web\js"
$bundleOut = Join-Path $PSScriptRoot "..\web\overlay_bundle.js"
$client = Join-Path $PSScriptRoot "..\web\overlay-client.js"

Write-Host "Bundling overlay client files into $bundleOut..."

if (-Not (Test-Path $webJsPath)) { Write-Host "web/js not found. Please run protoc to generate JS stubs into web/js."; exit 1 }

$files = Get-ChildItem -Path $webJsPath -Filter "*.js" | Sort-Object Name

Remove-Item $bundleOut -ErrorAction SilentlyContinue

foreach ($f in $files) {
    Get-Content $f.FullName | Add-Content $bundleOut
}
Get-Content $client | Add-Content $bundleOut

Write-Host "Bundle written to $bundleOut."
