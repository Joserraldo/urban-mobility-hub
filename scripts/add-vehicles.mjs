// Agrega más patinetas (y 2 en venta) a data/umh.db sin tocar lo existente. Uso: node scripts/add-vehicles.mjs
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.env.UMH_DB_PATH ?? "data/umh.db");
const hubs = {
  "HUB-01": [7.1193, -73.109],
  "HUB-02": [7.1098, -73.1066],
  "HUB-03": [7.1163, -73.1213],
  "HUB-04": [7.0647, -73.0905],
};
const rent = [
  ["SC-1171", "Volt S3", 480, "Autonomía 40 km · 25 km/h", 95, "HUB-01"],
  ["SC-1172", "Volt S3", 480, "Autonomía 40 km · 25 km/h", 88, "HUB-01"],
  ["SC-1180", "Volt S2", 450, "Autonomía 32 km · 25 km/h", 76, "HUB-02"],
  ["SC-1181", "Volt S2", 450, "Autonomía 32 km · 25 km/h", 81, "HUB-02"],
  ["SC-1190", "Volt Pro", 520, "Autonomía 45 km · 30 km/h", 90, "HUB-03"],
  ["SC-1191", "Volt Pro", 520, "Autonomía 45 km · 30 km/h", 69, "HUB-03"],
  ["SC-1200", "Volt S3", 480, "Autonomía 40 km · 25 km/h", 100, "HUB-04"],
  ["SC-1201", "Volt S2", 450, "Autonomía 32 km · 25 km/h", 73, "HUB-04"],
  ["SC-1210", "Volt S3", 480, "Autonomía 40 km · 25 km/h", 97, "HUB-01"],
  ["SC-1211", "Volt S2", 450, "Autonomía 32 km · 25 km/h", 84, "HUB-02"],
  ["SC-1212", "Volt Pro", 520, "Autonomía 45 km · 30 km/h", 93, "HUB-03"],
  ["SC-1213", "Volt S3", 480, "Autonomía 40 km · 25 km/h", 79, "HUB-04"],
];
const rentBikes = [
  ["BK-2270", "Urban e-Bike", 380, "Pedaleo asistido · 60 km", 90, "HUB-01"],
  ["BK-2271", "Eco E-Bike", 380, "Autonomía 60 km · asistida 25 km/h", 85, "HUB-02"],
  ["BK-2272", "Urban e-Bike", 380, "Pedaleo asistido · 60 km", 77, "HUB-04"],
];
const sale = [
  ["SV-5007", "Volt S3 (venta)", 2890000, "Autonomía 40 km · garantía 12 meses", "nuevo", "HUB-01"],
  ["SV-5008", "Volt Pro (venta)", 3750000, "750 W · 45 km · suspensión dual", "nuevo", "HUB-03"],
  ["SV-5009", "Volt S2 Edition", 2890000, "500 W · 32 km · IPX5", "nuevo", "HUB-01"],
  ["SV-5010", "Volt S2 Edition", 2890000, "500 W · 32 km · IPX5", "nuevo", "HUB-02"],
  ["SV-5011", "Volt S3 (venta)", 3100000, "Autonomía 40 km · garantía 12 meses", "nuevo", "HUB-04"],
  [
    "SV-5012",
    "Volt Pro (venta)",
    3250000,
    "750 W · 45 km · suspensión dual",
    "seminuevo",
    "HUB-02",
  ],
  ["SV-5013", "Volt Pro (venta)", 3750000, "750 W · 45 km · suspensión dual", "nuevo", "HUB-04"],
  [
    "SV-5014",
    "Volt S3 (venta)",
    2650000,
    "Autonomía 40 km · 6 meses de uso",
    "seminuevo",
    "HUB-03",
  ],
];
const saleBikes = [
  ["SV-5101", "Urban e-Bike Lite", 4200000, "250 W · 60 km · aluminio", "nuevo", "HUB-01"],
  ["SV-5102", "Urban e-Bike Lite", 4200000, "250 W · 60 km · aluminio", "nuevo", "HUB-04"],
  [
    "SV-5103",
    "Eco E-Bike (venta)",
    2150000,
    "Autonomía 60 km · 1 año de uso",
    "seminuevo",
    "HUB-02",
  ],
  [
    "SV-5104",
    "Eco E-Bike (venta)",
    2450000,
    "Autonomía 60 km · asistida 25 km/h",
    "nuevo",
    "HUB-03",
  ],
];
const saleDrones = [
  ["SV-5201", "AeroLift 4 Cargo", 9800000, "Carga 5 kg · GPS RTK", "nuevo", "HUB-01"],
  ["SV-5202", "AeroLift 4 Cargo", 9800000, "Carga 5 kg · GPS RTK", "nuevo", "HUB-03"],
  ["SV-5203", "Cargo D2 (venta)", 7400000, "Carga 3 kg · 18 min de vuelo", "nuevo", "HUB-02"],
];
const ins = db.prepare(`INSERT OR IGNORE INTO vehicles
 (id,kind,model,mode,status,condition,price_cop,rate_per_min_cop,spec,battery,lat,lng,hub_id,alert_state,deliverable,qr_code)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'ok',?,?)`);
let n = 0,
  i = 0;
// Deja a la venta lo que ya se vendió en pruebas (las compras quedan en el historial).
db.exec("UPDATE vehicles SET status='available' WHERE mode='sale' AND status='sold'");
for (const [id, model, rate, spec, bat, hub] of rentBikes) {
  const [la, ln] = hubs[hub];
  i++;
  n += Number(
    ins.run(
      id,
      "bike",
      model,
      "rent",
      "available",
      null,
      null,
      rate,
      spec,
      bat,
      la + i * 0.0004,
      ln - i * 0.0003,
      hub,
      1,
      `UMH:${id}`,
    ).changes,
  );
}
for (const [kind, list] of [
  ["bike", saleBikes],
  ["drone", saleDrones],
]) {
  for (const [id, model, price, spec, cond, hub] of list) {
    const [la, ln] = hubs[hub];
    i++;
    n += Number(
      ins.run(
        id,
        kind,
        model,
        "sale",
        "available",
        cond,
        price,
        null,
        spec,
        100,
        la + i * 0.0004,
        ln - i * 0.0003,
        hub,
        0,
        `UMH:${id}`,
      ).changes,
    );
  }
}
for (const [id, model, rate, spec, bat, hub] of rent) {
  const [la, ln] = hubs[hub];
  i++;
  n += Number(
    ins.run(
      id,
      "scooter",
      model,
      "rent",
      "available",
      null,
      null,
      rate,
      spec,
      bat,
      la + i * 0.0004,
      ln - i * 0.0003,
      hub,
      i % 2,
      `UMH:${id}`,
    ).changes,
  );
}
for (const [id, model, price, spec, cond, hub] of sale) {
  const [la, ln] = hubs[hub];
  i++;
  n += Number(
    ins.run(
      id,
      "scooter",
      model,
      "sale",
      "available",
      cond,
      price,
      null,
      spec,
      100,
      la + i * 0.0004,
      ln - i * 0.0003,
      hub,
      0,
      `UMH:${id}`,
    ).changes,
  );
}
console.log(
  `insertados ${n}; total vehículos:`,
  db.prepare("select count(*) c from vehicles").get().c,
);
