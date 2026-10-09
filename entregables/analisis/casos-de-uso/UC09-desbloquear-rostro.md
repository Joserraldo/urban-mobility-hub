# UC09 — Desbloquear con rostro

| Campo               | Valor                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC09                                                                                                                                         |
| Actor principal     | Cliente                                                                                                                                      |
| Actores secundarios | Servicio facial (detección en el navegador, face-api.js; el video NO se sube); Vehículo IoT (recibe `UNLOCK` al cerrar UC08)                 |
| Requisito(s)        | RF-10; RNF-03 (plantilla biométrica cifrada); `«extend»` de UC08                                                                             |
| Prioridad           | P2                                                                                                                                           |
| Estimación          | 5 h (HU-09a..b)                                                                                                                              |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png`; secuencia `../../diseno/img/04-secuencia-desbloqueo.png` |
| Historias           | HU-09a, HU-09b                                                                                                                               |

**Intención.** Sustituir el escaneo del QR por una verificación facial cuando el cliente no puede leer el código, respetando que el rostro solo se usa si hay consentimiento vigente y la plantilla está cifrada, y devolviendo el control a UC08 en el paso de casco.

**Precondiciones.**

- Sesión de desbloqueo abierta con `step='qr'` (paso 1–2 de UC08); el rostro es la puerta de identidad alterna al QR, no un paso adicional.
- Existe `biometric_templates` del usuario (`user_id`, `cipher_text`, `iv`, `auth_tag` — AES-GCM).
- Existe `consents` con `purpose='biometria'`, `revoked=false` (RF-20). Sin consentimiento NO hay plantilla que comparar.
- El navegador tiene la cámara habilitada y carga face-api.js.

**Garantías (postcondiciones).**

- El video nunca sale del navegador: el sistema solo recibe el `score` de similitud; del servidor no se envía ningún fotograma ni descriptor crudo.
- La plantilla permanece cifrada en reposo; se descifra únicamente en memoria durante la comparación y se vuelve a cerrar.
- Un rostro NO coincidente deja `unlock_sessions.step='denied'` y un incidente registrado; el vehículo NUNCA se desbloquea por esta vía.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                               | Datos (tabla / endpoint)                                                  |
| --- | --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Cliente         | En el paso QR de UC08 elige "Desbloquear con mi rostro"                      | `«extend»` sobre la sesión `step='qr'`                                    |
| 2   | Sistema         | Comprueba consentimiento vigente ANTES de tocar la plantilla                 | `SELECT consents WHERE user_id AND purpose='biometria' AND revoked=false` |
| 3   | Sistema         | Confirma que existe plantilla                                                | `SELECT biometric_templates WHERE user_id`                                |
| 4   | Cliente         | El navegador detecta el rostro y calcula el descriptor (face-api.js)         | — (local, sin subir video)                                                |
| 5   | Sistema         | Descifra la plantilla en memoria, calcula similitud y evalúa `verifyFace`    | `POST /api/unlock/sessions/{id}/face {score, registered, consent}`        |
| 6   | Sistema         | `score ≥ 0.85` (`FACE_MIN_SIMILARITY`) y consentimiento OK → `step='helmet'` | `UPDATE unlock_sessions SET step='helmet'`                                |
| 7   | Sistema         | Devuelve el control a UC08 paso 5 (verificación de casco)                    | continúa en UC08                                                          |

### Pasos alternos

- **5a (HU-09b).** El cliente aún no tiene plantilla: el sistema ofrece enrolarla (RF-22) en una pantalla separada, con consentimiento biométrico ya aceptado; tras guardar `biometric_templates` el rostro queda habilitado para los próximos desbloqueos. El enrolamiento se gestiona en la cuenta del usuario, no dentro del desbloqueo.
- **6a.** Coincide el rostro pero el cliente prefiere el QR en ese momento: se descarta el intento facial (sin `denied`, sin incidente) y se reintenta por QR en la MISMA sesión `step='qr'`.
- **2a.** Consentimiento presente pero con `revoked=true` (RF-22): se trata como "sin consentimiento" → rostro no disponible (E1) hasta volver a aceptar.

### Excepciones

- **E1.** Sin consentimiento `'biometria'` vigente o sin plantilla: 403 "el desbloqueo facial no está disponible", se ofrece volver al QR (UC08 paso 3); NUNCA se descifra ni se compara nada.
- **E2.** `score < 0.85`, o `registered=false`: `step='denied'`, `reason='No reconocimos tu rostro'` + incidente en la bitácora de seguridad; el vehículo no se desbloquea. Se aplica el mismo límite de intentos que el QR para no permitir fuerza bruta de rostros.
- **E3.** `step ≠ 'qr'` (ya pasó a `'helmet'`, o sesión cerrada): `verifyFace` lanza `UnlockOrderError` ("Orden de pasos inválido"); no se reabre la puerta de identidad.
- **E4.** Sesión caducada (`now > expires_at`, TTL 120 s): `step='expired'`; hay que iniciar una sesión nueva (UC08 2a).
- **E5.** La plantilla no descifra (`auth_tag` no valida en AES-GCM, datos alterados): se maneja como "sin plantilla" y se registra un incidente de integridad; bajo ninguna circunstancia se desbloquea sobre una plantilla sospechosa.

### Reglas de negocio

- `FACE_MIN_SIMILARITY = 0.85`: umbral duro; `score < 0.85` ⇔ `denied`.
- Rostro y QR son **alternativos** en el paso de identidad: la sesión admite una u otra verificación (ambas terminan en `step='helmet'`), nunca ambas en serie.
- Condición necesaria del facial: consentimiento `'biometria'` vigente `Y` no `revoked` `Y` plantilla existente (RF-20/RF-22/RNF-03). Se comprueba antes de descifrar.
- `biometric_templates` cifrado con AES-GCM (`cipher_text`, `iv`, `auth_tag`); nunca en texto plano (RNF-03).
- RF-22: revocar el consentimiento o eliminar la cuenta BORRA `biometric_templates` y desactiva este caso de inmediato.
- El `step='helmet'` resultante se consume con la misma máquina de UC08 (`qr → helmet → ready`); este caso no toca `vehicles` ni `reservations`.

### Fuera de alcance de este caso

- Enrolar, reemplazar o borrar la plantilla (RF-22, pantalla de cuenta). Aquí solo se consume la existente (5a menciona el enrolamiento como puerta, no lo implementa).
- La verificación de casco y el `start` del viaje (UC08 pasos 5–10).
- El consentimiento inicial en el registro (UC01, RF-20).
