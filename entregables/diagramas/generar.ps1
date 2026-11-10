# Genera PNG + SVG de todos los diagramas PlantUML de esta carpeta.
# Requisitos: Java y plantuml.jar en esta misma carpeta (no se sube a git).
# Uso: powershell -File entregables\diagramas\generar.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$jar = if (Test-Path plantuml.jar) { "plantuml.jar" } else { "../_tools/plantuml.jar" }
$layout = if (Get-Command dot -ErrorAction SilentlyContinue) { @() } else { @("-Playout=smetana") }
java -jar $jar @layout -tpng -o ../img fuentes/*.puml
java -jar $jar @layout -tsvg -o ../img fuentes/*.puml
Write-Host "Listo: imagenes en $PSScriptRoot\img"
