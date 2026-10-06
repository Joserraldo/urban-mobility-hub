"""Diagrama de contexto del SRS (notacion Yourdon / puntos de funcion).

  Sistema                  = ovalo
  Entidad externa          = rectangulo
  Archivo logico (ILF/EIF) = dos lineas horizontales (superior e inferior)
  EI entrada / EO salida / EQ consulta = flechas rotuladas (las mismas del Plan, seccion 4.1.1)

Uso: python contexto_srs.py -> ../analisis/img/00-diagrama-contexto-srs.png
"""
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, Rectangle

OUT = Path(__file__).resolve().parent.parent / "analisis" / "img" / "00-diagrama-contexto-srs.png"
INK, MUTED = "#1B2A41", "#6B7A90"
C_EI, C_EO, C_EQ, C_FILE = "#2F5DA8", "#2E7D63", "#C2710C", "#6B4FA0"
plt.rcParams["font.family"] = "Segoe UI"

fig, ax = plt.subplots(figsize=(21, 13.5))
ax.set_aspect("equal")
ax.axis("off")
ax.set_xlim(-31, 32)
ax.set_ylim(-15.5, 14)

# ---------------- sistema (ovalo) ----------------
A, B = 8.2, 5.0
ax.add_patch(Ellipse((0, 0), 2 * A, 2 * B, fc="#E8F0FE", ec=INK, lw=2.6, zorder=3))
ax.text(0, 0.1, "Plataforma Multimodal\nde Micromovilidad,\nLogística y Venta\nde Vehículos Urbanos", ha="center", va="center",
        fontsize=14, fontweight="bold", color=INK, zorder=4, linespacing=1.25)


def on_oval(deg):
    r = math.radians(deg)
    return (A * math.cos(r), B * math.sin(r))


# ---------------- entidades externas (rectangulos) ----------------
def entity(cx, cy, w, h, title, sub):
    ax.add_patch(Rectangle((cx - w / 2, cy - h / 2), w, h, fc="white", ec=INK, lw=2.2, zorder=3))
    ax.text(cx, cy + 0.45, title, ha="center", va="center", fontsize=13.5, fontweight="bold", color=INK, zorder=4)
    ax.text(cx, cy - 0.85, sub, ha="center", va="center", fontsize=9.5, color=MUTED, style="italic", zorder=4)


U = (-23.5, 0.0, 6.0, 15.0)   # usuario final
O = (23.5, 0.0, 6.0, 10.0)    # operador
V = (0.0, 11.3, 11.0, 3.2)    # vehiculo IoT
entity(U[0], U[1], U[2], U[3], "Usuario\nfinal", "persona")
entity(O[0], O[1], O[2], O[3], "Operador", "persona")
entity(V[0], V[1], V[2], V[3], "Vehículo IoT", "Raspberry Pi (gemelo digital)")


# ---------------- archivos logicos (dos lineas horizontales) ----------------
def store(cx, cy, w, tag, name, color):
    h = 2.5
    for y in (cy + h / 2, cy - h / 2):
        ax.plot([cx - w / 2, cx + w / 2], [y, y], color=color, lw=2.6, zorder=3, solid_capstyle="butt")
    ax.text(cx, cy + 0.42, tag, ha="center", va="center", fontsize=9.5, fontweight="bold", color=color, zorder=4)
    ax.text(cx, cy - 0.35, name, ha="center", va="center", fontsize=11.5, fontweight="semibold", color=INK, zorder=4)
    return (cx, cy + h / 2), (cx, cy - h / 2)


ilf = [("ILF1", "Flota"), ("ILF2", "Hubs"), ("ILF3", "Reservas"), ("ILF4", "Usuarios"), ("ILF5", "Log de eventos")]
ILF_Y = -11.3
ilf_pts = []
for i, (tag, name) in enumerate(ilf):
    x = -16 + i * 8
    top, _ = store(x, ILF_Y, 6.6, tag + " (interno)", name, C_FILE)
    ilf_pts.append(top)

eif = [("EIF1", "Reconocimiento\nfacial", (-17.5, 10.8)), ("EIF2", "Pasarela\nde pagos", (17.5, 10.8)),
       ("EIF3", "Proveedor\nde mapas", (24.0, -9.6))]
eif_pts = []
for tag, name, (x, y) in eif:
    pts = store(x, y, 7.2, tag + " (externo)", name.replace("\n", " "), C_FILE)
    eif_pts.append(pts)


# ---------------- flujos ----------------
def arrow(p0, p1, color, label, kind, lx=0.5, ly=0.0, both=False, rad=0.0, dy=0.0, ha="center"):
    style = "<|-|>" if both else "-|>"
    ls = (0, (5, 3)) if kind == "EQ" else "solid"
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle=style, mutation_scale=17, lw=2.0, color=color, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", zorder=2, shrinkA=0, shrinkB=0))
    mx, my = p0[0] + (p1[0] - p0[0]) * lx, p0[1] + (p1[1] - p0[1]) * lx + ly
    ax.text(mx, my + dy, label, ha=ha, va="center", fontsize=10.2, fontweight="semibold", color=color, zorder=5,
            bbox=dict(boxstyle="round,pad=0.22", fc="white", ec="none", alpha=0.96))


# Usuario -> sistema (8 flujos, de arriba abajo)
ux = U[0] + U[2] / 2
user_flows = [
    ("EI1  Comprar vehículo", "EI", C_EI, False),
    ("EI2  Reservar alquiler (hub / domicilio)", "EI", C_EI, False),
    ("EI3  Escanear código QR", "EI", C_EI, False),
    ("EI4  Verificar casco (imagen de cámara)", "EI", C_EI, False),
    ("EQ1  Consultar catálogo de venta", "EQ", C_EQ, True),
    ("EQ2  Consultar flota en alquiler", "EQ", C_EQ, True),
    ("EQ3  Consultar detalle de hub", "EQ", C_EQ, True),
    ("EO1  Actualizar posición en el mapa", "EO", C_EO, False),
]
n = len(user_flows)
for i, (label, kind, color, both) in enumerate(user_flows):
    ys = 6.3 - i * (12.6 / (n - 1))
    deg = 180 - 40 + i * (80 / (n - 1))
    p_sys = on_oval(deg)
    p_usr = (ux, ys)
    if kind == "EO":
        arrow(p_sys, p_usr, color, label, kind, lx=0.5)
    elif both:
        arrow(p_usr, p_sys, color, label, kind, lx=0.5, both=True)
    else:
        arrow(p_usr, p_sys, color, label, kind, lx=0.5)

# Operador <-> sistema (4 flujos)
ox = O[0] - O[2] / 2
op_flows = [
    ("EI6  Simular evento IoT", "EI", C_EI, False, "in"),
    ("EQ4  Consultar detalle de gemelo digital", "EQ", C_EQ, True, "in"),
    ("EO2  Mostrar KPIs de flota", "EO", C_EO, False, "out"),
    ("EO3  Notificar alerta (< 1 s)", "EO", C_EO, False, "out"),
]
for i, (label, kind, color, both, d) in enumerate(op_flows):
    ys = 3.6 - i * 2.4
    p_sys = on_oval(30 - i * 20)
    p_op = (ox, ys)
    if d == "in":
        arrow(p_op, p_sys, color, label, kind, lx=0.5, both=both)
    else:
        arrow(p_sys, p_op, color, label, kind, lx=0.5)

# Vehiculo IoT -> sistema
arrow((0, V[1] - V[3] / 2), (0, B), C_EI, "EI5  Registrar evento de alerta / telemetría (MQTT)", "EI", lx=0.5, ha="left")

# EIF (consultas hacia sistemas externos)
arrow(on_oval(125), eif_pts[0][1], C_EQ, "reconocer rostro", "EQ", lx=0.5, both=True)
arrow(on_oval(55), eif_pts[1][1], C_EQ, "procesar pago", "EQ", lx=0.62, both=True)
arrow(on_oval(-30), eif_pts[2][0], C_EQ, "teselas y mapa", "EQ", lx=0.6, both=True)

# ILF (lectura / escritura)
for i, top in enumerate(ilf_pts):
    deg = -90 + (i - 2) * 22
    arrow(on_oval(deg), top, C_FILE, "", "ILF", both=True)

# ---------------- titulo y leyenda ----------------
ax.text(0, 13.4, "Diagrama de contexto — Plataforma Multimodal de Micromovilidad", ha="center", fontsize=17, fontweight="bold", color=INK)

lx0, ly0 = -29.5, -14.3
items = [("EI  Entrada externa", C_EI, "solid"), ("EO  Salida externa", C_EO, "solid"), ("EQ  Consulta externa", C_EQ, (0, (5, 3)))]
for k, (t, c, ls) in enumerate(items):
    x = lx0 + k * 11.2
    ax.add_patch(FancyArrowPatch((x, ly0), (x + 2.6, ly0), arrowstyle="-|>", mutation_scale=15, lw=2, color=c, linestyle=ls))
    ax.text(x + 3.1, ly0, t, va="center", fontsize=10.5, color=INK)
x = lx0 + 3 * 11.2 + 1
for yy in (ly0 + 0.5, ly0 - 0.5):
    ax.plot([x, x + 2.6], [yy, yy], color=C_FILE, lw=2.4)
ax.text(x + 3.1, ly0, "Archivo lógico (ILF interno / EIF externo)", va="center", fontsize=10.5, color=INK)
ax.add_patch(Rectangle((x + 20.5, ly0 - 0.6), 1.8, 1.2, fc="white", ec=INK, lw=1.6))
ax.text(x + 22.8, ly0, "Entidad externa", va="center", fontsize=10.5, color=INK)

OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, dpi=170, bbox_inches="tight", facecolor="white")
print("OK", OUT)
