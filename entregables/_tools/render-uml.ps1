# Renderiza todos los .puml de entregables a PNG+SVG en su carpeta img/ (hermana de src/).
# Uso: powershell -File entregables\_tools\render-uml.ps1  [-Only ruta\archivo.puml]
param([string]$Only = "")
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot | Split-Path -Parent
if ($Only) {
  $files = @(Get-Item $Only)
} else {
  $files = Get-ChildItem -Recurse -Path $root -Filter *.puml | Where-Object { $_.FullName -notmatch "_v1|node_modules" }
}
foreach ($f in $files) {
  $imgDir = Join-Path (Split-Path -Parent (Split-Path -Parent $f.FullName)) "img"
  New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
  java -jar (Join-Path $PSScriptRoot "plantuml.jar") -tpng -o $imgDir $f.FullName
  java -jar (Join-Path $PSScriptRoot "plantuml.jar") -tsvg -o $imgDir $f.FullName
  $out = Join-Path $imgDir ($f.BaseName + ".png")
  if (Test-Path $out) { Write-Host "OK  $out" } else { Write-Host "FALLO $($f.FullName)" }
}
