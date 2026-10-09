# UC02 — Iniciar o cerrar sesión

| Campo               | Valor                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID                  | UC02                                                                                                                                               |
| Actor principal     | Compartido (Cliente, Operador, Domiciliario)                                                                                                       |
| Actores secundarios | —                                                                                                                                                  |
| Requisito(s)        | RF-21; RNF-05                                                                                                                                      |
| Prioridad           | P1                                                                                                                                                 |
| Estimación          | 4 h (HU-02a..b)                                                                                                                                    |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png`; secuencia `../../diseno/img/14-secuencia-auth-pago-cierre.png` |
| Historias           | HU-02a, HU-02b                                                                                                                                     |

**Intención.** Autenticar al dueño de un correo contra el `password_hash` y sostener una sesión firmada con expiración —la puerta única de identidad que `«include»` UC18 y que requieren UC03–UC17 y UC20—; cerrarla revoca el token.

**Precondiciones.**

- Existe una cuenta creada en UC01.
- El actor provee correo y contraseña.

**Garantías (postcondiciones).**

- Sesión iniciada = cookie `umh_session` httpOnly firmada (o `Authorization: Bearer`) con expiración; el identificador de sesión no se guarda en claro (hash/firma, RNF-05).
- Tras el logout la sesión deja de autenticar (401).
- Un intento fallido NO revela si el correo existe: mismo 401 `INVALID_CREDENTIALS`.

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema                           | Datos (tabla / endpoint)                                                       |
| --- | --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Cliente         | Entra a `/login`, escribe correo y contraseña            | formulario                                                                     |
| 2   | Sistema         | Busca al usuario y verifica la contraseña contra el hash | `SELECT users WHERE email=:email` + verificación de `password_hash`            |
| 3   | Sistema         | Si coincide, emite sesión firmada con expiración         | `POST /api/auth/login` → set-cookie `umh_session` (httpOnly, Secure, SameSite) |
| 4   | Sistema         | Devuelve el perfil de la sesión                          | `AuthResponse {user, token}`                                                   |
| 5   | Cliente         | (más adelante) pulsa "Cerrar sesión"                     | `POST /api/auth/logout`                                                        |
| 6   | Sistema         | Invalida la sesión actual                                | revoca el token; la cookie deja de autenticar                                  |

### Pasos alternos

- **2a.** Login a mitad de compra/alquiler/desbloqueo: si no hay sesión, el caso padre redirige a `/login` y, al volver, retoma el flujo (UC02 es `«include»` de UC18 y requisito de UC03–UC17, UC20).
- **3a.** `GET /api/auth/me` confirma al cargar la app quién está conectado (y su `role`).

### Excepciones

- **E1.** Correo o contraseña incorrectos: 401 `INVALID_CREDENTIALS` con mensaje genérico — nunca dice "el correo no existe" (no enumera cuentas).
- **E2.** Cinco intentos fallidos seguidos para el mismo correo en 15 min: 429 `RATE_LIMITED` (mitiga fuerza bruta).
- **E3.** Token expirado o revocado en una llamada protegida: 401 `UNAUTHENTICATED`; el cliente reautentica.
- **E4.** Logout sin sesión: 204 idempotente (nada que revocar).

### Reglas de negocio

- La verificación usa SIEMPRE el hash (argon2 / PBKDF2); prohibido comparar texto plano (RNF-05).
- La sesión se firma/hashea y caduca; el `role` (`'user'|'operator'|'courier'`) viaja en el token y cada caso comprueba el suyo (UC13 operador, UC14–UC17 domiciliario/operador).
- Los tres roles heredan del Cliente: todos inician sesión por aquí.
- El login NO cuenta como paso en el presupuesto de RNF-07.
- Nuance de la dependencia del maestro: UC03 se puede VER en anónimo (solo su rama de compra exige esta sesión); UC20 autentica el dispositivo con `x-ingest-key`, no con un login humano.

### Fuera de alcance de este caso

- Crear la cuenta (UC01) y el enrolamiento facial (`/api/auth/face`).
- Autorización por recurso (quién ve qué reserva): la define cada caso; aquí solo se autentica la identidad.
