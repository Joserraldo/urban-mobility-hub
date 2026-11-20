# Entrega final — Urban Mobility Hub (NODO Mobility)

Entrega del 20 de noviembre de 2026 · Ingeniería de Software II · UNAB · Docente: Daniel Arenas Seleey.

Integrantes: Jaime Alejandro Vega Barbosa, José Alejandro Téllez Prada y David Santiago González Nigrinis.

## Qué contiene esta carpeta

| Elemento                                          | Contenido                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Entrega_Analisis_Diseno_OO_UrbanMobilityHub.pdf` | Documento de análisis y diseño orientado a objetos: UML, C4, casos de prueba, avance técnico y trazabilidad.                                                  |
| `Entrega_Pantallazos_UrbanMobilityHub.pdf`        | Pantallazos de la página y del software, por módulo y rol, con ruta, caso de uso y componente de cada pantalla.                                               |
| `html/`                                           | Fuente HTML de los dos PDF (se generan con `tools/build.mjs`).                                                                                                |
| `assets/`                                         | Recortes de las capturas largas, partidos en páginas para el PDF.                                                                                             |
| `capturas-nuevas/`                                | Capturas del 20-nov-2026 de las funciones nuevas (monitoreo, mantenimiento, catálogo, entregas, cámara del PC, QR, app móvil).                                |
| `tools/`                                          | Generador de los PDF (Playwright + pdf-lib): `build.mjs`, `content-analisis.mjs`, `content-pantallazos.mjs`, `lib.mjs`, `estilo.css` y `capturar-nuevas.mjs`. |

## Qué ítem del enunciado responde cada parte

| Ítem solicitado                            | Dónde está                                                                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagrama de casos de uso                   | PDF de análisis, capítulo 1: general, uno por actor y catálogo de 20 casos de uso.                                                                                                                         |
| Diagrama de clases UML (vista estática)    | Capítulo 2: clases del dominio, clases de análisis BCE y modelo de datos.                                                                                                                                  |
| Diagramas de secuencia de los casos de uso | Capítulo 3: D-15 a D-20, D-28 y D-29 (cubren los 20 casos de uso) y estados D-21 a D-23.                                                                                                                   |
| Diagrama de paquetes                       | Capítulo 4.                                                                                                                                                                                                |
| Diagrama de componentes                    | Capítulo 5 (UML y C4 nivel 3).                                                                                                                                                                             |
| Diagrama de nodos                          | Capítulo 6 (despliegue en VM Azure y topología de demo local).                                                                                                                                             |
| Un caso de prueba por integrante           | Capítulo 7: CP0001_ALQUILER (Jaime Alejandro Vega Barbosa), CP0002_DESBLOQUEO (José Alejandro Téllez Prada), CP0003_ENTREGA (David Santiago González Nigrinis). Ninguno es de registro o inicio de sesión. |
| Pantallazos de la página y del software    | `Entrega_Pantallazos_UrbanMobilityHub.pdf`.                                                                                                                                                                |

Complementos: vistas C4 (capítulo 8), avance técnico y pendientes (capítulo 10), matriz de trazabilidad (capítulo 11).

## Diagramas nuevos en esta entrega

Fuentes en `entregables/diagramas/fuentes/`, imágenes en `entregables/diagramas/img/`.

- `28-secuencia-consultas-cliente.puml`: catálogo, mapa en vivo y detalle de hub (UC03, UC06, UC07).
- `29-secuencia-operador-kpis-catalogo.puml`: KPIs, gemelos digitales, catálogo, hubs y mantenimiento (UC10, UC13).
- `22-estados-vehiculo.puml` regenerado con el estado «En mantenimiento».

Con D-28 y D-29 los 20 casos de uso tienen diagrama de secuencia.

## Cómo regenerar

Desde la raíz del repositorio, en Git Bash.

Instalar las dependencias del generador:

```
npm --prefix entregables/entrega-final/tools install
```

Generar los dos PDF y el HTML:

```
CHROME_PATH="C:/Users/jose/AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe" node entregables/entrega-final/tools/build.mjs
```

`CHROME_PATH` es opcional: si ya se ejecutó `npx playwright install chromium`, basta con `node entregables/entrega-final/tools/build.mjs`.

Volver a tomar las capturas nuevas (requiere el servidor con datos de demostración):

```
UMH_SEED_DEMO=1 npm run dev:api
```

```
node entregables/entrega-final/tools/capturar-nuevas.mjs
```

La segunda orden se ejecuta en otra terminal; usa `http://localhost:8080` salvo que se defina `BASE_URL`.

## Decisiones

- **Formato del caso de prueba.** Se usa la plantilla de clase (`Plantilla caso de prueba.docx`, publicada en TEMA): identificador `CP####_xxxxxxxx`, función a probar, objetivo, descripción, criterios de éxito y de falla, precondiciones, perfil del usuario, necesidades, autor, fecha de creación, flujo (No. paso · usuario del sistema · sistema) y postcondiciones. Debajo de cada plantilla va, como información complementaria, la trazabilidad, las variantes negativas y la evidencia de las pruebas automatizadas.
- **Marca y nombre del proyecto.** El proyecto del curso se llama Urban Mobility Hub; NODO Mobility es la marca de producto que ve el usuario. Los documentos usan el nombre del proyecto como título y la marca donde se describe la interfaz.
- **Evidencia automatizada.** Cada caso de prueba cita las pruebas de Vitest y Playwright del repositorio que lo respaldan; los pasos de interfaz se muestran en la demostración en vivo.

## Demostración

El procedimiento para levantar la demo local (servidor, visión, túnel HTTPS y webcam como ESP32-CAM) está en [`docs/LANZAMIENTO.md`](../../docs/LANZAMIENTO.md).
