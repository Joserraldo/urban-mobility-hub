$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"
function J($o) { $o | ConvertTo-Json -Depth 8 -Compress }
function NewSession { New-Object Microsoft.PowerShell.Commands.WebRequestSession }
function Req($method, $path, $body, $sess) {
  $h = @{ Method = $method; Uri = "$base$path"; WebSession = $sess }
  if ($null -ne $body) { $h.ContentType = "application/json"; $h.Body = (J $body) }
  (Invoke-WebRequest -UseBasicParsing @h).Content | ConvertFrom-Json
}

# reset de BD
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2
Remove-Item -Recurse -Force data -ErrorAction SilentlyContinue
Start-Process cmd -ArgumentList '/c','npm run dev:api > %TEMP%\opencode\dev.log 2>&1' -WindowStyle Hidden -WorkingDirectory $PWD
foreach ($i in 1..25) { Start-Sleep -Seconds 3; try { (Invoke-WebRequest -UseBasicParsing "$base/api/health" -TimeoutSec 3) | Out-Null; break } catch {} }
"server up con BD limpia"

$c2 = NewSession
Req POST "/api/auth/login" @{ email = "cliente2@demo.co"; password = "Demo1234!" } $c2 | Out-Null
$rent = Req GET "/api/vehicles?mode=rent" $null $c2
$delig = @($rent | Where-Object { $_.delivery -and $_.status -eq "available" })
"vehiculos aptos domicilio: $($delig.Count)"

# reserva A: pagada, SIN asignar (para el panel de pendientes)
$a = Req POST "/api/reservations" @{ vehicleId = $delig[0].id; modality = "delivery"; address = "Calle 45 #1-23, Barrio La Punta, Bucaramanga" } $c2
Req POST "/api/payments" @{ ownerType = "reservation"; ownerId = $a.reservation.id } $c2 | Out-Null
# reserva B: pagada, asignada a domi1, iniciada y tardia (para bandeja + notificaciones)
$b = Req POST "/api/reservations" @{ vehicleId = $delig[1].id; modality = "delivery"; address = "Cra 27 #36-10, Cabecera del Llano" } $c2
Req POST "/api/payments" @{ ownerType = "reservation"; ownerId = $b.reservation.id } $c2 | Out-Null

$o = NewSession
Req POST "/api/auth/login" @{ email = "operador@demo.co"; password = "Demo1234!" } $o | Out-Null
Req POST "/api/deliveries" @{ reservationId = $b.reservation.id; courierId = "USRD-DOMI1"; deadlineMinutes = 30 } $o | Out-Null

$ku = NewSession
Req POST "/api/auth/login" @{ email = "domi1@demo.co"; password = "Demo1234!" } $ku | Out-Null
$dvs = Req GET "/api/deliveries" $null $ku
$delivId = $dvs[0].id
Req POST "/api/deliveries/$delivId" @{ action = "start" } $ku | Out-Null
Req POST "/api/deliveries/$delivId" @{ action = "late"; reason = "tráfico en la Cabecera: retén en la calle 45" } $ku | Out-Null
Start-Sleep -Seconds 4
$nots = Req GET "/api/notifications" $null $o
"notificaciones: $($nots.Count) ($($nots[0].status))"
"flujo listo para capturas"
