# 03 · Requisitos no funcionales (RNF-01…RNF-12)

Los RNF-01 a RNF-10 vienen del SRS v1.1; RNF-11 y RNF-12 son nuevos de la v1.2 y fueron propuestos
por el equipo de calidad. A diferencia de los RF, aquí **la mayoría exige una medición**, y varias
no tienen instrumento: se marcan como cumplidas por diseño solo cuando el mecanismo es verificable
en código.

## 1. Tablero

| RNF    | Requisito (resumen)                                   | Veredicto      | Medición / evidencia                                                                 |
| ------ | ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| RNF-01 | Posición en el mapa en ≤ 5 s                          | ✅ Cumple       | Simulador cada **2 s** + SSE inmediato (`fleet-sim.ts:17`, `applyTelemetry`)           |
| RNF-02 | Alerta en el panel en < 1 s                           | ✅ Cumple       | `stream.emit` en el mismo ciclo de ingesta; sin medición automatizada                 |
| RNF-03 | Plantillas biométricas cifradas, nunca en claro       | ❌ No cumple    | Plantilla falsa en BD; vector 16×16 en `localStorage` sin cifrar                      |
| RNF-04 | Log auditable, solo se agrega                         | ✅ Cumple       | Tabla `alerts` de solo inserción; “limpiar” cambia estado, no borra filas             |
| RNF-05 | Credenciales y sesiones seguras                       | 🟡 Parcial      | `scrypt` + sal y sesión firmada; **secret por defecto** y cookie sin `Secure`         |
| RNF-06 | Disponibilidad ≥ 95 % en el periodo de pruebas        | ⚪ No verificable | No hay despliegue; no existe periodo de observación                                   |
| RNF-07 | Compra, alquiler y desbloqueo en ≤ 3 pasos            | ✅ Cumple       | Compra: elegir → confirmar/pagar · Alquiler: elegir → modalidad → confirmar · Desbloqueo: QR → casco → iniciar |
| RNF-08 | Agregar hub/vehículo sin cambios estructurales        | ✅ Cumple       | Alta desde `/admin`; el modelo `Vehicle`/`Hub` no cambia                             |
| RNF-09 | Módulos actualizables de forma independiente          | 🟡 Parcial      | Dominio separado; `handlers.ts` y `repositories.ts` concentran venta/alquiler/tracking/seguridad |
| RNF-10 | Sustituir la fuente simulada por backend real         | ✅ Cumple       | Contrato `DataSource` con adaptadores `mock` y `api`; **pero** el build no sirve `/api/*` |
| RNF-11 | SEO ≥ 95 · Accesibilidad ≥ 90 · Rendimiento ≥ 85      | ❌ No cumple    | `/` = 90 / **80** / 100 / 100; falla accesibilidad                                   |
| RNF-12 | Cobertura ≥ 80 % en desbloqueo, seguridad y tracking  | ✅ Cumple       | 94,23 % sentencias · 92,85 % ramas; alcance de 52 sentencias (D-15)                  |

**Recuento: 7 ✅ · 2 🟡 · 2 ❌ · 1 ⚪.**

## 2. RNF-11 · La brecha medible

### 2.1 Qué se prometió

`lighthouserc.json` convierte la meta del SRS en una **aserción bloqueante**:

```json
"categories:accessibility": ["error", { "minScore": 0.9 }]
```

Es decir, no es una aspiración: el propio pipeline definido por el equipo falla si la accesibilidad
baja de 90. Y el HANDOFF afirma “`/` perf 96 · a11y 96 · BP 100 · SEO 100”.

### 2.2 Qué se midió

Comando: `NITRO_PRESET=node_server npm run build` y `npx lhci autorun --config=lighthouserc.json`
con `CHROME_PATH` apuntando a Edge, 2 corridas por URL, preset `desktop`.

| URL          | Rendimiento | Accesibilidad | Buenas prácticas | SEO   |
| ------------ | ----------- | ------------- | ---------------- | ----- |
| `/`          | 90          | **80**        | 100              | 100   |
| `/catalogo`  | 97          | 98            | 100              | 100   |

`lhci` termina con **código de salida 1** y el mensaje:

```
categories.accessibility failure for minScore assertion
  expected: >=0.9
     found: 0.8
```

Las dos corridas de `/` dan 80/80; no es ruido estadístico.

### 2.3 Causa raíz (auditorías que puntúan 0)

| Auditoría          | Qué señaló                                                                 |
| ------------------ | -------------------------------------------------------------------------- |
| `color-contrast`   | Texto con contraste insuficiente sobre fondos claros (varios elementos)     |
| `definition-list`  | `<dl>` con contenido que no son `dt`/`dd`                                  |
| `dlitem`           | Hijos de `<dl>` que no son `dt`/`dd`                                       |
| `list`             | `<ul>`/`<ol>` con hijos que no son `<li>`                                  |
| `listitem`         | `<li>` fuera de una lista o lista mal anidada                              |
| `heading-order`    | Solo en `/catalogo`: salto de nivel de encabezado                          |

Ninguna requiere rediseño: son correcciones de marcado y de tokens de color. Pero **mientras no se
corrijan, la afirmación “metas RNF-11 cumplidas” es falsa** y el gate de Lighthouse del CI está en
rojo.

### 2.4 Nota metodológica

La medición es con Edge de escritorio. El fallo es de DOM/CSS, por lo que cambiar de navegador no lo
elimina; el contraste podría variar unos puntos, pero no de 80 a 90. Para que la evidencia sea
comparable con el HANDOFF, hay que volver a correr Lighthouse **después** de corregir y adjuntar el
reporte.

## 3. RNF-03 · Privacidad biométrica

### 3.1 Qué pide

“Las plantillas biométricas utilizadas para el reconocimiento facial deben almacenarse **cifradas y
nunca en texto plano**”. Es el RNF con mayor consecuencia legal (Ley 1581 de 2012, riesgo RD11).

### 3.2 Qué hay, por capa

| Capa                | Qué se guarda                                                                 | ¿Cifrado? |
| ------------------- | ----------------------------------------------------------------------------- | --------- |
| Servidor (SQLite)   | `cipher_text = Buffer.from("plantilla-demo-no-biometria-real")`, `iv` y `auth_tag` vacíos | **No** (ni siquiera es una plantilla) |
| Adaptador mock      | `faceTemplate` (vector de 256 números) dentro del usuario en `localStorage`     | **No**    |
| Navegador (ambos)   | `umh.face.template` en `localStorage`, texto plano                             | **No**    |

`dataKey()` existe en `src/server/db/seed.ts:6-10` y se exporta, pero **no se usa en ninguna parte**:
no hay `createCipheriv`, ni AES-GCM, ni comparación de etiquetas. La columna `cipher_text` es un
nombre sin implementación.

### 3.3 Por qué no es “solo un detalle de demo”

1. El texto del consentimiento afirma que “la plantilla se guarda cifrada”. Si no se cifra, el
   consentimiento es inexacto.
2. La plantilla del cliente es una miniatura de la cara (16×16 en grises): es un dato biométrico
   real, no un hash irreversible. Cualquier script de la página puede leerla.
3. El servidor acepta el veredicto facial del cliente, así que el dato ni siquiera se usa para
   autenticar de verdad.

**Veredicto:** ❌. No es un incumplimiento “menor de demo”; es exactamente el riesgo RD11 del
análisis de riesgos, materializado.

## 4. RNF-05 · Credenciales y sesiones

### 4.1 Lo que está bien

- Contraseñas con `scryptSync(password, salt, 64)`, sal aleatoria de 16 bytes y comparación en
  tiempo constante (`seed.ts:11-22`). No hay contraseñas en claro.
- Sesión `nonce.userId.exp.hmac` firmada con HMAC-SHA256, expiración de 24 h y verificación de firma
  (`sessions.ts`).
- Cookie `HttpOnly; SameSite=Lax; Path=/`.
- RBAC con `requireUser` / `requireRole` (401/403) en todos los endpoints sensibles.

### 4.2 Lo que impide marcarlo como cumplido

| Punto                          | Riesgo                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Secret por defecto             | `UMH_SESSION_SECRET ?? "umh-demo-session-secret-cambiar-en-produccion"`: si se despliega sin la variable, cualquiera conoce la clave y puede **forjar sesiones**. |
| Clave de datos por defecto     | `UMH_DATA_KEY ?? "umh-demo-data-key-cambiar-en-produccion"` (además, sin uso).                   |
| Cookie sin `Secure`            | En producción HTTPS, la cookie viajaría también por HTTP si hubiera una redirección o un host mixto. |
| Logout solo borra la cookie    | La sesión es *stateless*: el token robado sigue siendo válido hasta su expiración (24 h). No hay lista de revocación. |
| SRS pide argon2 o bcrypt       | Se usa `scrypt`, que es un KDF lento con sal y cumple el **espíritu**; el texto literal del SRS menciona otros dos algoritmos. Se puede aceptar `scrypt` actualizando el SRS, o cambiar el algoritmo. |

**Veredicto:** 🟡. La base es correcta; los valores por defecto y la ausencia de `Secure`/revocación
son los huecos.

## 5. RNF-12 · Cobertura

```
All files        | 94.23 % stmts | 92.85 % branch | 100 % funcs | 100 % lines
 unlock.ts       |    90 %       |   88.46 %      |  100 %      |  100 %
 alerts.ts       |   100 %       |   100 %        |  100 %      |  100 %
 reservations.ts |   100 %       |   100 %        |  100 %      |  100 %
 tracking.ts     |   100 %       |   100 %        |  100 %      |  100 %
```

- ✅ El umbral de 80 % se cumple con holgura en los cuatro módulos que el requisito nombra
  (desbloqueo, seguridad, tracking y reservas).
- ✅ El CI ejecuta `npm run test:coverage` en cada push/PR.
- 🟡 **El perímetro es estrecho**: `coverage.include` es `src/server/domain/**/*.ts`, unas **52
  sentencias**. Quedan fuera `services/` (pasarela 2 s de latencia, Brevo, sesiones, simulador) y
  `api/handlers.ts`, que es donde vive la lógica de negocio que más se rompe. El propio registro lo
  admite como D-15.
- ⚠️ La tabla de la consola solo lista `unlock.ts`; los otros tres aparecen al 100 % y el reporter
  los omite visualmente. No es un error de cálculo, pero **un lector apresurado puede creer que solo
  se midió un archivo**. El `coverage-summary.json` sí los incluye.

**Veredicto:** ✅ con salvedad de alcance. No inflar el número: “94 %” se refiere a 52 sentencias de
dominio, no al sistema.

## 6. RNF-01, RNF-02 y RNF-06 · Lo que no se midió

| RNF    | Mecanismo verificable                          | Falta                                                                 |
| ------ | ---------------------------------------------- | --------------------------------------------------------------------- |
| RNF-01 | Intervalo de 2 s < 5 s; SSE empuja la posición | Una prueba que mida el delta `ts` de generación → render en el mapa    |
| RNF-02 | `stream.emit` en el mismo ciclo que la alerta  | Una prueba de latencia alerta → panel (< 1 s); hoy es argumento de diseño |
| RNF-06 | —                                              | No hay despliegue ni ventana de observación; **no se puede afirmar**   |

El plan SQA prometía “pruebas de rendimiento ligeras (RNF-01 y RNF-02 medidas)” con “ms medidos vs
umbral”. No existen: ni en `tests/` ni en el informe de ejecución (que tampoco existe, ver `05`).

## 7. RNF-07 en detalle (por qué cumple)

| Flujo       | Pasos reales en la interfaz                                              | Total |
| ----------- | ------------------------------------------------------------------------ | ----- |
| Compra      | 1 seleccionar vehículo · 2 abrir checkout · 3 confirmar/pagar            | 3     |
| Alquiler    | 1 seleccionar vehículo · 2 elegir modalidad · 3 confirmar (paga dentro)  | 3     |
| Desbloqueo  | 1 escanear QR · 2 verificar casco · 3 iniciar viaje                      | 3     |

El inicio de sesión no cuenta, como define el SRS. No hay pasos ocultos adicionales.

## 8. Conclusión

Los RNF “de mecanismo” (posición, alerta, log, pasos, escalabilidad, sustitución de fuente,
cobertura) están razonablemente resueltos. Los RNF “de garantía” (cifrado, sesión endurecida,
accesibilidad, disponibilidad) son los que fallan, y son justamente los que un evaluador puede
comprobar sin leer el código: Lighthouse, una inspección de `localStorage` y un `curl` al build.
