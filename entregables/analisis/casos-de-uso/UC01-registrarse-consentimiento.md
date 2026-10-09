# UC01 — Registrarse y dar consentimiento

| Campo               | Valor                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC01                                                                                                                                               |
| Actor principal     | Cliente                                                                                                                                            |
| Actores secundarios | Operador / Domiciliario (heredan el registro: `role='operator'`/`'courier'`)                                                                       |
| Requisito(s)        | RF-20; RNF-03, RNF-05; Ley 1581 de 2012                                                                                                            |
| Prioridad           | P1                                                                                                                                                 |
| Estimación          | 4 h (HU-01a..b)                                                                                                                                    |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png`; secuencia `../../diseno/img/14-secuencia-auth-pago-cierre.png` |
| Historias           | HU-01a, HU-01b                                                                                                                                     |

**Intención.** Crear la identidad en `users` con la contraseña hasheada y los consentimientos explícitos y SEPARADOS que exige la Ley 1581. Sin consentimiento de datos personales no nace la cuenta; sin consentimiento biométrico no existe plantilla facial.

**Precondiciones.**

- El correo no está en `users` (`email` es UNIQUE).
- No hay sesión previa (el registro es público).

**Garantías (postcondiciones).**

- Existe UNA fila `users` con `password_hash` (argon2 / PBKDF2, nunca texto plano) y `role='user'` en el alta pública.
- Existe `consents(user_id, purpose='datos_personales', accepted_at)`; la de `purpose='biometria'` solo si el usuario aceptó el trato de rostro.
- Sin consentimiento de datos personales NO hay cuenta (422). Sin consentimiento biométrico NO hay fila en `biometric_templates`.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                                                                                        | Datos (tabla / endpoint)                                                                                        |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Cliente         | Escribe nombre, correo, contraseña y marca el consentimiento de datos personales (y, si quiere rostro, el biométrico) | formulario `/registro`                                                                                          |
| 2   | Sistema         | Valida campos (password ≥ 8) y fija `role='user'` en el alta pública                                                  | `POST /api/auth/register {name, email, password, consent, biometricConsent?}`                                   |
| 3   | Sistema         | Comprueba unicidad del correo                                                                                         | `SELECT users WHERE email = :email`                                                                             |
| 4   | Sistema         | Deriva la contraseña a hash con sal — jamás guarda texto plano                                                        | `password_hash` (RNF-05)                                                                                        |
| 5   | Sistema         | Crea cuenta + consentimiento de datos personales (transacción)                                                        | `INSERT users (role='user', created_at=epoch ms)` + `INSERT consents (purpose='datos_personales', accepted_at)` |
| 6   | Sistema         | Si aceptó rostro: registra el consentimiento biométrico separado (plantilla aún no)                                   | `INSERT consents (purpose='biometria', accepted_at)`                                                            |
| 7   | Sistema         | Inicia sesión y devuelve el perfil                                                                                    | `AuthResponse {user, token}` (UC02)                                                                             |

### Pasos alternos

- **6a.** El cliente quiere enrolar el rostro en el momento: aquí solo queda el consentimiento; la plantilla se cifra al enrolar (`PUT /api/auth/face`) y se guarda en `biometric_templates(user_id, cipher_text, iv, auth_tag)` con AES-GCM (RNF-03). El enrolamiento NO es parte de este caso.
- **2a.** Alta de operador o domiciliario: mismo formulario, pero el `role` (`'operator'|'courier'`) lo fija el sistema por invitación/seed, no lo elige el público (RF-23/24). El seed trae cuentas de demo.

### Excepciones

- **E1.** Sin consentimiento de datos personales: 422 CONSENT_REQUIRED; no se inserta en `users` (la cuenta no nace).
- **E2.** Correo duplicado: 409 EMAIL_TAKEN.
- **E3.** Contraseña corta o campos inválidos: 400 VALIDATION_ERROR antes de hashear.
- **E4.** Consentimiento biométrico marcado pero el `INSERT users` falla: la transacción revierte TODO; no queda `consents` huérfano.

### Reglas de negocio

- Consentimientos por finalidad, EXPLÍCITOS y SEPARADOS (datos personales ≠ biométrica) — Ley 1581. Cada finalidad es una fila en `consents` con su `accepted_at`; revocar marca `revoked`, no borra el historial.
- `password_hash` SIEMPRE con derivación lenta y sal (argon2 / PBKDF2); prohibido texto plano o cifrado reversible (RNF-05).
- La plantilla facial es opt-in: sin `consents(purpose='biometria')` vigente es imposible crear `biometric_templates`.
- `created_at` y `accepted_at` en epoch ms.

### Fuera de alcance de este caso

- Enrolar / reemplazar / eliminar la plantilla biométrica (RF-22, `PUT`/`DELETE /api/auth/face`, flujo de rostro UC09).
- Iniciar o cerrar sesión (UC02) y la gestión de roles por el operador (UC13).
