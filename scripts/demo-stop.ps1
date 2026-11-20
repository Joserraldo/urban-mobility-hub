# Cierra la demo local: túnel, API (8080) y visión (8090). Lo ejecuta la tarea programada de las 11:00.
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
foreach ($port in 8080, 8090) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
