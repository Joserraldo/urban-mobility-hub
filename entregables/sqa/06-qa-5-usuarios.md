# 06 · QA con 5 usuarios de primera vez

**Fecha:** 6-nov-2026 · **Objetivo:** recorrer la app desplegada como lo haría un usuario nuevo, desde la
landing hasta el primer éxito (una reserva), y corregir lo que estorba.
**Método:** 5 perfiles automatizados con Playwright en navegador real; luego los mismos 5 perfiles contra
el build corregido.

## Perfiles

| #   | Perfil             | Qué hizo                                                                        |
| --- | ------------------ | ------------------------------------------------------------------------------- |
| 1   | Impaciente         | Primer botón visible; se va al primer error                                     |
| 2   | Escéptico          | Leyó términos, privacidad, tarifas y FAQ antes de registrarse                   |
| 3   | Móvil, 3G lenta    | 375 px, táctil, 400 ms de latencia, ~400 kbps, CPU 4× más lenta                 |
| 4   | Hablante no nativo | Solo sigue el texto literal de la interfaz (locale en-US)                       |
| 5   | El que rompe       | Basura en formularios, doble clic, Atrás a mitad de flujo, peticiones paralelas |

## Hallazgos, ordenados por cuántos perfiles los sufrieron

| Perfiles | Hallazgo                                                                     | Estado                                                   |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| 5 de 5   | Jerga interna visible ("tabla payments", "UC02", "backend: npm run dev:api") | Corregido                                                |
| 4 de 5   | Botón de cierre de diálogos en inglés ("Close")                              | Corregido                                                |
| 4 de 5   | Cuentas demo con contraseña visibles en producción                           | Abierto (decisión del equipo; los términos lo declaran)  |
| 3 de 5   | Error "Error 400" sin motivo (QR incorrecto)                                 | Corregido                                                |
| 3 de 5   | "Más cercano" elegía un vehículo ya reservado (409)                          | Corregido                                                |
| 3 de 5   | Lo escrito antes de que cargue el JS se perdía                               | Corregido (campos deshabilitados hasta hidratar)         |
| 3 de 5   | Contadores incoherentes ("7 vehículos" vs. 11, "1 vehículos")                | Corregido                                                |
| 2 de 5   | Sin términos, privacidad ni contacto (404)                                   | Corregido (`/terminos`, `/privacidad`, `/contacto`)      |
| 2 de 5   | Casillas de consentimiento sin enlace a documento                            | Corregido                                                |
| 2 de 5   | Prepago cobrado sin mostrar monto ni aviso de simulación                     | Corregido                                                |
| 2 de 5   | FAQ y `llms.txt` afirmaban rostro cifrado (falso hoy)                        | Corregido; ver brecha biométrica en `PENDIENTES.md`      |
| 2 de 5   | Tutorial dice "seis pasos" pero tiene siete                                  | Corregido                                                |
| 1 de 5   | Doble reserva del mismo vehículo con peticiones paralelas                    | Corregido (reserva retiene el vehículo al crearse)       |
| 1 de 5   | Doble cobro al finalizar viaje con doble clic                                | Corregido (candado en servidor y botón deshabilitado)    |
| 1 de 5   | Pagar una compra pendiente de un vehículo ya vendido                         | Corregido                                                |
| 1 de 5   | Transiciones inválidas respondían 500 con texto en inglés                    | Corregido (409, en español)                              |
| 1 de 5   | Nombre de 10 000 caracteres rompía el diseño                                 | Corregido (límites 80/128/254 en servidor y `maxlength`) |
| 1 de 5   | `/api/health` revelaba la ruta de la base de datos                           | Corregido                                                |
| 1 de 5   | `llms.txt`, `robots.txt` y `sitemap.xml` con dominio y precios equivocados   | Corregido                                                |
| 1 de 5   | "Más cercano" antes de cargar los datos decía "sin vehículos"                | Corregido (botón deshabilitado mientras carga)           |

## Abierto (no se corrigió en esta pasada)

- Sin selector de idioma; textos de Leaflet ("Zoom in/out") en inglés.
- Mapa en blanco sin esqueleto durante la carga en 3G; primera carga de ~2,3 MB.
- Áreas táctiles de 36 px en botones del mapa (guía recomienda 44 px); marcador de hub tapa vehículos cercanos.
- Mensaje "Falta el consentimiento biométrico (RF-20/RF-22)" sin acción siguiente (ver `PENDIENTES.md` §2.1).
- Recargar durante un viaje activo no muestra "Finalizar" en `/app` (sí en `/mis-reservas`).
- Fechas d/m/a y precios sin "COP" para lectores extranjeros.
- Contacto solo por issues públicos de GitHub; falta un correo del equipo.

## Verificación

Segunda ronda de los 5 perfiles contra el build corregido (local, puerto 3111): todos los puntos de la
tabla marcados "Corregido" se confirmaron, excepto lo listado en "Abierto". Pruebas: Vitest 100/100
(nuevo `tests/integration/qa-usuarios.test.ts` cubre doble reserva, doble cancelación y límites de registro),
`tsc` y `eslint` sin errores.
