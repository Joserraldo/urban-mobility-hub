# Genera PNG + SVG de todos los diagramas PlantUML de esta carpeta.
# Requisitos: Java y plantuml.jar (en esta carpeta o en ..\_tools). Graphviz es opcional.
# Los diagramas con `!pragma layout elk` usan ELK (viene en el jar); los demas usan Graphviz
# si existe y, si no, el motor interno Smetana.
# Uso: powershell -File entregables\diagramas\generar.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$jar = if (Test-Path plantuml.jar) { "plantuml.jar" } else { "../_tools/plantuml.jar" }
$fallback = if (Get-Command dot -ErrorAction SilentlyContinue) { @() } else { @("-Playout=smetana") }
foreach ($f in Get-ChildItem fuentes/*.puml) {
  $layout = if (Select-String -Path $f.FullName -Pattern '^!pragma layout' -Quiet) { @() } else { $fallback }
  foreach ($t in "png", "svg") {
    java -DPLANTUML_LIMIT_SIZE=8192 -jar $jar @layout "-t$t" -o ../img $f.FullName
  }
}
Write-Host "Listo: imagenes en $PSScriptRoot\img"
