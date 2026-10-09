# Gestión: documentos v1.2 (propuestos)

Tres archivos nuevos que corrigen el SRS, el Plan y el Análisis de Riesgos. **Los originales (.docx/.pdf) no se tocaron.**

| Archivo                     | Qué corrige                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `SRS_v1.2.md`               | H2, H5, H6, H7, H9 (+ H10 nuevo: contraseñas se _hashean_, no se cifran)  |
| `Plan_v1.2.md`              | H1 (COCOMO), H8 (cronograma), re-estimación por RF nuevos, capacidad real |
| `Riesgos_v1.2.md`           | H3 (SGR faltantes), H4 (RD10), H9 (RD8) + RD14, RD15                      |
| `img/01-matriz-riesgos.png` | Matriz de riesgos v1.2 (fuente en `mmd/`)                                 |

## Resumen de hallazgos

| #   | Hallazgo                                                           | Dónde se resolvió         |
| --- | ------------------------------------------------------------------ | ------------------------- |
| H1  | COCOMO: 25,5 pm / 7,8 meses / 3,3 personas (v1.0 decía 24,2 / 7,4) | Plan §4.1.3               |
| H2  | Faltan RF de registro, sesión y consentimiento                     | SRS RF-20 a RF-22         |
| H3  | RD9, RD12, RD13 sin SGR                                            | Riesgos §3                |
| H4  | RD10 impacto 2 → 4                                                 | Riesgos §1                |
| H5  | RF-08 duplica RNF-01                                               | SRS RF-08                 |
| H6  | RF-09 vs RNF-07 ambiguos                                           | SRS RNF-07                |
| H7  | Faltan RF de catálogo y hubs                                       | SRS RF-23, RF-24          |
| H8  | DFD vencido (30-sep)                                               | Plan §4.2.4, Riesgos RD14 |
| H9  | "Conducción indebida" sin definir                                  | SRS RF-11, Riesgos RD8    |

## Decisiones que necesitan al equipo/docente

1. ~~Aprobar RF-20 a RF-24~~ **Aprobados (1-oct)**, con prioridades P1–P3. Falta aprobar la re-estimación (34,6 pm); dada la capacidad (~8 pm), el recorte por prioridad es obligatorio.
2. Versionar los documentos dentro del repositorio (`docs/`) o mantenerlos aparte (Plan §6.3).
3. Convertir a .docx para entregar al docente (no hay `pandoc` instalado; se puede hacer desde Word pegando el Markdown).
