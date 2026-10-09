$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"

function J($o) { $o | ConvertTo-Json -Depth 8 -Compress }
function NewSession { New-Object Microsoft.PowerShell.Commands.WebRequestSession }
function Req($method, $path, $body, $sess) {
  $h = @{ Method = $method; Uri = "$base$path"; WebSession = $sess }
  if ($null -ne $body) { $h.ContentType = "application/json"; $h.Body = (J $body) }
  $r = Invoke-WebRequest -UseBasicParsing @h
  if ($r.Content) { $r.Content | ConvertFrom-Json } else { $null }
}

Write-Host "1) login cliente"
$cs = NewSession
$login = Req POST "/api/auth/login" @{ email = "cliente@demo.co"; password = "Demo1234!" } $cs
Write-Host ("   -> " + (J $login))

Write-Host "2) me"
(J (Req GET "/api/auth/me" $null $cs))

Write-Host "3) vehicles rent"
$vs = Req GET "/api/vehicles?mode=rent" $null $cs
$vid = ($vs | Where-Object { $_.status -eq "available" } | Select-Object -First 1).id
Write-Host ("   -> " + $vs.Count + " total; eligiendo " + $vid)

Write-Host "4) reservar hub + UC18 pago"
$res = Req POST "/api/reservations" @{ vehicleId = $vid; modality = "hub" } $cs
$rid = $res.reservation.id
$pay = Req POST "/api/payments" @{ ownerType = "reservation"; ownerId = $rid } $cs
Write-Host ("   -> reserva " + $rid + " pago " + (J $pay))

Write-Host "5) desbloqueo qr -> helmet -> start"
$us = Req POST "/api/unlock/sessions" @{ vehicleId = $vid; reservationId = $rid } $cs
$sid = $us.id
$s2 = Req POST "/api/unlock/sessions/$sid/qr" @{ code = "UMH:$vid" } $cs
$s3 = Req POST "/api/unlock/sessions/$sid/helmet" @{ helmetDetected = $true; confidence = 0.95 } $cs
$st = Req POST "/api/unlock/sessions/$sid/start" @{} $cs
$veh = Req GET "/api/vehicles/$vid" $null $cs
Write-Host ("   qr=" + $s2.step + " helmet=" + $s3.step + " reserva=" + $st.reservation.status + " vehiculo=" + $veh.status)

Write-Host "6) cerrar viaje"
$end = Req POST "/api/trips/$rid/end" @{} $cs
Write-Host ("   -> total " + $end.total + " ref " + $end.reference + " estado " + $end.reservation.status)

Write-Host "7) compra + pago + sold"
$sa = Req GET "/api/vehicles?mode=sale" $null $cs
$saleId = ($sa | Where-Object { $_.status -eq "available" } | Select-Object -First 1).id
$pu = Req POST "/api/purchases" @{ vehicleId = $saleId } $cs
$pp = Req POST "/api/payments" @{ ownerType = "purchase"; ownerId = $pu.purchase.id } $cs
$soldVeh = Req GET "/api/vehicles/$saleId" $null $cs
Write-Host ("   -> compra " + $pp.purchase.status + " vehiculo " + $soldVeh.status)

Write-Host "8) pago rechazado: cubierto en unitarias (monto magico 999999 de la pasarela simulada)"

Write-Host "9) cliente 2 reserva a domicilio"
$c2s = NewSession
Req POST "/api/auth/login" @{ email = "cliente2@demo.co"; password = "Demo1234!" } $c2s | Out-Null
$vr2 = Req GET "/api/vehicles?mode=rent" $null $c2s
$vid2 = ($vr2 | Where-Object { $_.status -eq "available" } | Select-Object -First 1).id
$d = Req POST "/api/reservations" @{ vehicleId = $vid2; modality = "delivery"; address = "Calle 45 #1-23, Campestre" } $c2s
Req POST "/api/payments" @{ ownerType = "reservation"; ownerId = $d.reservation.id } $c2s | Out-Null
$drid = $d.reservation.id
Write-Host ("   -> reserva domicilio " + $drid)

Write-Host "10) operador asigna -> courier inicia -> tardia -> Brevo simulated"
$os = NewSession
Req POST "/api/auth/login" @{ email = "operador@demo.co"; password = "Demo1234!" } $os | Out-Null
$pend = Req GET "/api/pending-deliveries" $null $os
$couriers = Req GET "/api/couriers" $null $os
Write-Host ("   pendientes=" + $pend.Count + " couriers=" + (($couriers | ForEach-Object { $_.id + ":" + $_.load }) -join ","))
$as = Req POST "/api/deliveries" @{ reservationId = $drid; courierId = "USRD-DOMI1"; deadlineMinutes = 45 } $os
$delid = $as.delivery.id
$kus = NewSession
Req POST "/api/auth/login" @{ email = "domi1@demo.co"; password = "Demo1234!" } $kus | Out-Null
$mine = Req GET "/api/deliveries" $null $kus
Write-Host ("   bandeja domi1: " + $mine.Count + " entregas")
Req POST "/api/deliveries/$delid" @{ action = "start" } $kus | Out-Null
Req POST "/api/deliveries/$delid" @{ action = "late"; reason = "trafico en la cabecera" } $kus | Out-Null
$d1 = Req GET "/api/deliveries?scope=all" $null $os
Write-Host ("   entrega ahora: " + ($d1 | Where-Object { $_.id -eq $delid }).status)

Start-Sleep -Seconds 3
Write-Host "11) notificaciones"
$not = Req GET "/api/notifications" $null $os
Write-Host ("   -> " + $not.Count + " filas; estados: " + (($not | ForEach-Object { $_.status }) -join ","))

Write-Host "12) kpis + alertas"
(J (Req GET "/api/admin/kpis" $null $os))
$al = Req POST "/api/admin/simulate-alert" @{ vehicleId = $vid2; type = "crash" } $os
Write-Host ("   simulada -> " + (J $al))

Write-Host "13) RBAC: courier no puede ver notificaciones"
$forb = $null
try { Req GET "/api/notifications" $null $kus | Out-Null } catch { $forb = $_.Exception.Response.StatusCode.value__ }
Write-Host ("   status courier -> " + $forb)

Write-Host "SMOKE DONE"
