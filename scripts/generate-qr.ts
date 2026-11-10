/**
 * Genera los QR imprimibles de los vehículos: public/qr/<ID>.png y una hoja public/qr/index.html para imprimir.
 *   npx tsx scripts/generate-qr.ts                 (vehículos de alquiler de la demo)
 *   npx tsx scripts/generate-qr.ts SC-1042 BK-2201 (los que indiques)
 * El contenido de cada QR es UMH:<id>; es lo que valida POST /api/unlock/sessions/:id/qr.
 * También se sirven al vuelo desde la API: GET /api/vehicles/:id/qr.svg (sirve para vehículos nuevos).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

const DEFAULT_IDS = ["SC-1042", "SC-1088", "SC-1120", "BK-2201", "BK-2244", "DR-3301", "DR-3315"];
const ids = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_IDS;
mkdirSync("public/qr", { recursive: true });

for (const id of ids) {
  await QRCode.toFile(`public/qr/${id}.png`, `UMH:${id}`, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 640,
  });
}

const cards = ids
  .map(
    (id) =>
      `<figure><img src="${id}.png" alt="QR del vehículo ${id}" width="300" height="300"><figcaption>${id}<small>UMH:${id}</small></figcaption></figure>`,
  )
  .join("\n");
writeFileSync(
  "public/qr/index.html",
  `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>QR de vehículos UMH</title>
<style>
body{font:16px system-ui,sans-serif;margin:24px;color:#14181f;background:#fff}
h1{font-size:1.2rem} p{color:#5b6472}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
figure{margin:0;text-align:center;border:1px solid #d9dde4;border-radius:12px;padding:16px;break-inside:avoid}
figcaption{font-weight:700;font-size:1.3rem;margin-top:8px} small{display:block;font-weight:400;color:#5b6472;font-size:.85rem}
@media print{p{display:none}}
</style></head><body>
<h1>QR de vehículos — Urban Mobility Hub</h1>
<p>Imprime y pega cada código en el manubrio de su vehículo. Al escanearlo en la app comienza el desbloqueo.</p>
<main>
${cards}
</main></body></html>
`,
);
console.log(`QR generados en public/qr/: ${ids.join(", ")}`);
