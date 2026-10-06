# Guía de contribución (resumen de la GCS)

Documento completo: `entregables/gcs/GCS_Gestion_de_Configuracion.md`.

## Flujo de trabajo en 6 pasos
1. `git checkout main && git pull`
2. `git checkout -b feature/mi-tema` (o `fix/…`, `docs/…`, `chore/…`)
3. Programa y prueba. Commits pequeños en formato convencional: `feat(unlock): agregar QR (RF-10)`
4. Antes de subir: `npm run lint && npm run typecheck && npm test`
5. `git push -u origin feature/mi-tema` y abre un Pull Request (usa la plantilla)
6. Cuando el CI esté en verde y otra persona apruebe, se fusiona con *squash*.

## Tipos de commit
`feat` · `fix` · `docs` · `test` · `refactor` · `ci` · `chore` · `perf` · `style` · `build` · `revert`

## Hooks locales (se instalan solos con `npm install`)
- `pre-commit`: revisa formato y lint solo de los archivos que cambiaste.
- `commit-msg`: rechaza mensajes que no sean convencionales.
- `pre-push`: corre typecheck y tests.

## Quality gates del CI
lint · typecheck · tests + cobertura (≥80 % módulos críticos) · commits · build · auditoría de dependencias · E2E · Lighthouse (SEO ≥95, A11y ≥90, Perf ≥85).

## Releases
Tags `v0.1`, `v0.2` (21-oct), `v0.3` (25-nov), `v1.0` (2-dic). Los crea el dueño del repo con CI verde.
