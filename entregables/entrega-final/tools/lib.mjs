// Utilidades compartidas por el generador de PDF.
import sharp from "sharp";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..", "..");
export const OUT = path.resolve(HERE, "..");
export const HTML_DIR = path.join(OUT, "html");
export const ASSETS = path.join(OUT, "assets");
mkdirSync(HTML_DIR, { recursive: true });
mkdirSync(ASSETS, { recursive: true });

/** Ruta relativa desde html/ a un archivo del repo. */
export const rel = (p) => path.relative(HTML_DIR, path.join(ROOT, p)).split(path.sep).join("/");

/** Dimensiones de una imagen del repo. */
export const dims = async (p) => {
  const { width, height } = await sharp(path.join(ROOT, p)).metadata();
  return { width, height };
};

/** Parte capturas muy altas en segmentos que caben en una página. Devuelve rutas relativas a html/. */
export async function segments(repoPath, maxRatio = 1.3) {
  const abs = path.join(ROOT, repoPath);
  const { width, height } = await sharp(abs).metadata();
  if (width < 800 || height / width <= maxRatio * 1.15) return [rel(repoPath)];
  const n = Math.max(1, Math.round(height / (width * maxRatio)));
  const segH = Math.ceil(height / n);
  const base = path.basename(repoPath, ".png");
  const outs = [];
  for (let i = 0; i < n; i++) {
    const top = i * segH;
    const h = Math.min(segH, height - top);
    const file = path.join(ASSETS, `${base}-p${i + 1}.png`);
    if (!existsSync(file)) await sharp(abs).extract({ left: 0, top, width, height: h }).toFile(file);
    outs.push(path.relative(HTML_DIR, file).split(path.sep).join("/"));
  }
  return outs;
}

export const CSS = readFileSync(path.join(HERE, "estilo.css"), "utf8");

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const AUTORES = [
  "Jaime Alejandro Vega Barbosa",
  "José Alejandro Téllez Prada",
  "David Santiago González Nigrinis",
];

/** Portada común. */
export const portada = ({ kicker, titulo, subtitulo, extra = "" }) => `
<section class="cover">
  <div class="cover-band"></div>
  <div class="cover-body">
    <div class="cover-uni">Universidad Autónoma de Bucaramanga · Facultad de Ingeniería<br>Ingeniería de Sistemas · Ingeniería de Software II</div>
    <div class="cover-kicker">${kicker}</div>
    <h1 class="cover-title">${titulo}</h1>
    <div class="cover-sub">${subtitulo}</div>
    <div class="cover-product"><span class="dot"></span> Urban Mobility Hub · <b>NODO Mobility</b> — Plataforma multimodal de micromovilidad, logística y venta de vehículos urbanos</div>
    ${extra}
    <table class="cover-meta">
      <tr><th>Integrantes</th><td>${AUTORES.join("<br>")}</td></tr>
      <tr><th>Docente</th><td>Daniel Arenas Seleey</td></tr>
      <tr><th>Fecha</th><td>20 de noviembre de 2026</td></tr>
      <tr><th>Producción</th><td>https://urbanmobility.duckdns.org</td></tr>
      <tr><th>Repositorio</th><td>github.com/Joserraldo/urban-mobility-hub</td></tr>
    </table>
  </div>
</section>`;

/** Documento HTML completo. */
export const documento = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title>
<style>${CSS}</style></head><body>${body}</body></html>`;

/** Entrada del índice con número de página (se completa en la segunda pasada). */
export const tocItem = (id, label, level = 1) =>
  `<li class="toc-l${level}"><a href="#${id}"><span class="t">${label}</span><span class="dots"></span><span class="pg" data-for="${id}"></span></a></li>`;
