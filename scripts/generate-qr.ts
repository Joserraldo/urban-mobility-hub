/**
 * Genera los QR imprimibles de los vehículos: public/qr/<ID>.png y una hoja public/qr/index.html para imprimir.
 *   npx tsx scripts/generate-qr.ts                 (vehículos de alquiler de la demo)
 *   npx tsx scripts/generate-qr.ts SC-1042 BK-2201 (los que indiques)
 *   npx tsx scripts/generate-qr.ts --out=docs/qr   (respaldo del repo: docs/qr/, con modelo, hub y "Cómo llegar")
 * El contenido de cada QR es UMH:<id>; es lo que valida POST /api/unlock/sessions/:id/qr.
 * También se sirven al vuelo desde la API: GET /api/vehicles/:id/qr.svg (sirve para vehículos nuevos).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

import { SEED_HUBS, SEED_VEHICLES } from "../src/lib/data/mock";

const DEFAULT_IDS = ["SC-1042", "SC-1088", "SC-1120", "BK-2201", "BK-2244", "DR-3301", "DR-3315"];
// Alquileres que añade seed-demo.ts (no están en el mock); los de viaje en vivo van aparte.
const DEMO_RENT_IDS = [
  "SC-1150",
  "SC-1163",
  "BK-2260",
  "DR-3330",
  "SC-1171",
  "SC-1172",
  "SC-1180",
  "SC-1181",
  "SC-1190",
  "SC-1191",
  "SC-1200",
  "BK-2270",
  "BK-2271",
  "BK-2272",
  "SC-1210",
  "SC-1211",
  "SC-1212",
  "SC-1213",
  "SC-1201",
  "SC-1202",
  "BK-2203",
];
const outArg = process.argv.find((a) => a.startsWith("--out="));
const outDir = outArg ? outArg.slice(6) : "public/qr";
const rest = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ids = rest.length > 0 ? rest : outArg ? [...DEFAULT_IDS, ...DEMO_RENT_IDS] : DEFAULT_IDS;
mkdirSync(outDir, { recursive: true });
const info = (id: string) => {
  const v = SEED_VEHICLES.find((x) => x.id === id);
  const h = SEED_HUBS.find((x) => x.id === v?.hubId);
  const maps = h
    ? ` · <a href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}">Cómo llegar</a>`
    : "";
  return v
    ? `${v.model}${h ? ` · ${h.name}` : ""}${maps}`
    : "Vehículo de la demo (ver /admin/qr para modelo y hub)";
};

for (const id of ids) {
  await QRCode.toFile(`${outDir}/${id}.png`, `UMH:${id}`, {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 640,
  });
}

const cards = ids
  .map(
    (id) =>
      `<figure><img src="${id}.png" alt="QR del vehículo ${id}" width="300" height="300"><figcaption>${id}<small>UMH:${id}</small><small>${info(id)}</small></figcaption></figure>`,
  )
  .join("\n");
writeFileSync(
  `${outDir}/index.html`,
  `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>QR de vehículos UMH</title>
<style>
body{font:16px system-ui,sans-serif;margin:24px;color:#14181f;background:#fff}
h1{font-size:1.2rem} p{color:#5b6472}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
figure{margin:0;text-align:center;border:1px solid #d9dde4;border-radius:12px;padding:16px;break-inside:avoid}
figcaption{font-weight:700;font-size:1.3rem;margin-top:8px} small{display:block;font-weight:400;color:#5b6472;font-size:.85rem}
@media print{p{display:none}main{grid-template-columns:repeat(3,1fr)}figure{padding:8px}img{width:100%;height:auto}}
</style></head><body>
<h1>QR de vehículos — Urban Mobility Hub</h1>
<p>Imprime y pega cada código en el manubrio de su vehículo. Al escanearlo en la app comienza el desbloqueo.</p>
<main>
${cards}
</main></body></html>
`,
);
console.log(`QR generados en ${outDir}/: ${ids.join(", ")}`);
