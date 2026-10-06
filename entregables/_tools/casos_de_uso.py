"""Diagrama de casos de uso - Plataforma de Micromovilidad (estilo documento tecnico).

Simbologia (la de example.png):
  Actor     = monigote de palitos
  Asociacion= linea continua
  include   = flecha punteada de punta abierta, x -> y
  extend    = flecha punteada de punta abierta, y -> x (el que extiende apunta al base)
  herencia  = flecha de linea continua con triangulo hueco (generalizacion entre actores: Operador -> Usuario final)

Uso: python casos_de_uso.py  -> ../analisis/img/01-casos-de-uso-uml.(png|svg)
"""
import math
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Rectangle

OUT = Path(__file__).resolve().parent.parent / "analisis" / "img" / "01-casos-de-uso-uml"

FONT = "Segoe UI"
INK = "#1B2A41"        # lineas y texto
MUTED = "#6B7A90"      # texto secundario
SYS_BG = "#F7F9FC"
HEAD = "#1B2A41"
USER_FILL, USER_EDGE = "#E8F0FE", "#2F5DA8"
OPS_FILL, OPS_EDGE = "#E6F4EF", "#2E7D63"
LW = 1.5

plt.rcParams["font.family"] = FONT
fig, ax = plt.subplots(figsize=(16, 19))
ax.set_aspect("equal")
ax.axis("off")

# ---- casos de uso -----------------------------------------------------------
CX, W, H, STEP = 76, 46, 7.2, 13.4
rows = [
    ("UC1", "Registrarse y dar consentimiento", "u"),
    ("UC3", "Ver catálogo de venta", "u"),
    ("UC5", "Ver flota y mapa multicapa", "u"),
    ("UC9", "Ver detalle de hub", "u"),
    ("UC4", "Comprar vehículo", "u"),
    ("UC2", "Iniciar sesión", "u"),
    ("UC6", "Alquilar vehículo (hub o domicilio)", "u"),
    ("UC7", "Desbloquear vehículo (QR + casco)", "u"),
    ("UC8", "Desbloquear con rostro", "u"),
    None,
    ("UC10", "Ver KPIs y gemelos digitales", "o"),
    ("UC11", "Simular evento IoT", "o"),
    ("UC13", "Gestionar catálogo y hubs", "o"),
    ("UC12", "Revisar log de alertas", "o"),
    ("UC14", "Reportar telemetría y alertas", "o"),
]
TOP = 168
GAP_GROUP = 12
uc, y = {}, TOP
for r in rows:
    if r is None:
        y -= GAP_GROUP
        continue
    uc[r[0]] = dict(x=CX, y=y, w=W, h=H, t=r[1], g=r[2])
    y -= STEP

BX0, BX1 = 46, 124                      # frontera del sistema
Y_TOP, Y_BOT = TOP + 16, uc["UC14"]["y"] - 9


def edge(c, target):
    dx, dy = target[0] - c["x"], target[1] - c["y"]
    a, b = c["w"] / 2, c["h"] / 2
    d = math.sqrt((dx / a) ** 2 + (dy / b) ** 2) or 1
    return (c["x"] + dx / d, c["y"] + dy / d)


# ---- frontera del sistema con encabezado --------------------------------------
ax.add_patch(FancyBboxPatch((BX0, Y_BOT), BX1 - BX0, Y_TOP - Y_BOT, boxstyle="round,pad=0,rounding_size=1.6",
                            fc=SYS_BG, ec=INK, lw=1.6, zorder=0))
ax.add_patch(FancyBboxPatch((BX0, Y_TOP - 7), BX1 - BX0, 7, boxstyle="round,pad=0,rounding_size=1.6",
                            fc=HEAD, ec=HEAD, lw=1.6, zorder=1))
ax.add_patch(Rectangle((BX0, Y_TOP - 7), BX1 - BX0, 3.5, fc=HEAD, ec=HEAD, lw=0, zorder=1))
ax.text((BX0 + BX1) / 2, Y_TOP - 3.5, "Sistema: Plataforma de Micromovilidad", ha="center", va="center",
        fontsize=14, fontweight="bold", color="white", zorder=2)

# etiquetas de grupo
y_sep = (uc["UC8"]["y"] + uc["UC10"]["y"]) / 2
ax.plot([BX0 + 3, BX1 - 3], [y_sep, y_sep], color="#C5CEDB", lw=1.1, ls=(0, (4, 3)), zorder=1)
ax.text(BX0 + 4, uc["UC1"]["y"] + 7.4, "FUNCIONES DEL USUARIO FINAL", fontsize=8.6, color=USER_EDGE,
        fontweight="bold", va="center", zorder=2)
ax.text(BX0 + 4, uc["UC10"]["y"] + 7.4, "OPERACIÓN Y TELEMETRÍA", fontsize=8.6, color=OPS_EDGE,
        fontweight="bold", va="center", zorder=2)

# ---- ovalos ---------------------------------------------------------------------
for k, c in uc.items():
    fc, ec = (USER_FILL, USER_EDGE) if c["g"] == "u" else (OPS_FILL, OPS_EDGE)
    ax.add_patch(Ellipse((c["x"], c["y"]), c["w"], c["h"], fc=fc, ec=ec, lw=1.7, zorder=3))
    ax.text(c["x"], c["y"], "\n".join(textwrap.wrap(c["t"], 30)), ha="center", va="center",
            fontsize=10.5, fontweight="semibold", color=INK, zorder=4, linespacing=1.1)


# ---- actores (monigote de palitos) -------------------------------------------------
def actor(x, y, label, sub, color=INK, s=1.0):
    r, lw = 2.5 * s, 1.9
    ax.add_patch(Circle((x, y + 9 * s), r, fc="white", ec=color, lw=lw, zorder=3))
    ax.plot([x, x], [y + 9 * s - r, y + 1.4 * s], color=color, lw=lw, zorder=3, solid_capstyle="round")
    ax.plot([x - 2.7 * s, x, x + 2.7 * s], [y + 4.4 * s, y + 6.4 * s, y + 4.4 * s], color=color, lw=lw,
            zorder=3, solid_capstyle="round", solid_joinstyle="round")
    ax.plot([x - 2.4 * s, x, x + 2.4 * s], [y - 2.4 * s, y + 1.4 * s, y - 2.4 * s], color=color, lw=lw,
            zorder=3, solid_capstyle="round", solid_joinstyle="round")
    ax.text(x, y - 4.8 * s, label, ha="center", va="top", fontsize=11.5, fontweight="bold", color=INK)
    ax.text(x, y - 4.8 * s - 2.9 * s * (label.count("\n") + 1), sub, ha="center", va="top", fontsize=9,
            color=MUTED, style="italic")
    return (x, y + 4 * s)


def gmid(a, b):
    return (uc[a]["y"] + uc[b]["y"]) / 2


A_U = actor(14, gmid("UC1", "UC8") - 4, "Usuario final", "persona", USER_EDGE)
A_O = actor(14, gmid("UC10", "UC14") - 4, "Operador", "persona", OPS_EDGE)
A_P = actor(156, uc["UC2"]["y"] - 4, "Pasarela de pagos", "sistema externo")
A_F = actor(156, uc["UC8"]["y"] - 4, "Servicio facial", "sistema externo")
A_D = actor(156, uc["UC14"]["y"] - 4, "Vehículo IoT", "Raspberry Pi")


# ---- generalizacion de actores: Operador es un Usuario final con permisos extra -----------
def hollow_triangle_arrow(x, y_from, y_to, color):
    """Linea continua que sube de y_from a y_to con triangulo hueco en y_to."""
    th = 3.2
    ax.plot([x, x], [y_from, y_to - th], color=color, lw=LW, zorder=2, solid_capstyle="butt")
    ax.add_patch(plt.Polygon([(x, y_to), (x - th * 0.62, y_to - th), (x + th * 0.62, y_to - th)],
                             closed=True, fc="white", ec=color, lw=LW, zorder=3, joinstyle="miter"))


y_user_bottom = A_U[1] - 4 - 4.8 - 2.9 - 2.4      # debajo del texto del actor
y_op_top = A_O[1] - 4 + 9 + 2.5 + 0.8             # sobre la cabeza del Operador
hollow_triangle_arrow(14, y_op_top, y_user_bottom, INK)

# ---- asociaciones ----------------------------------------------------------------------
def trunk(actor_pt, keys, tx, color):
    ys = [uc[k]["y"] for k in keys] + [actor_pt[1]]
    kw = dict(color=color, lw=LW, zorder=2, solid_capstyle="round")
    ax.plot([actor_pt[0], tx], [actor_pt[1], actor_pt[1]], **kw)
    ax.plot([tx, tx], [min(ys), max(ys)], **kw)
    for k in keys:
        c = uc[k]
        ax.plot([tx, c["x"] - c["w"] / 2], [c["y"], c["y"]], **kw)


def assoc(actor_pt, key, color=INK):
    c = uc[key]
    p = edge(c, actor_pt)
    ax.plot([actor_pt[0], p[0]], [actor_pt[1], p[1]], color=color, lw=LW, zorder=2, solid_capstyle="round")


trunk((A_U[0] + 3, A_U[1]), ["UC1", "UC3", "UC5", "UC9", "UC4", "UC2", "UC6", "UC7", "UC8"], 32, USER_EDGE)
trunk((A_O[0] + 3, A_O[1]), ["UC10", "UC11", "UC13", "UC12"], 32, OPS_EDGE)
assoc((A_P[0] - 3, A_P[1]), "UC4")
assoc((A_P[0] - 3, A_P[1]), "UC6")
assoc((A_F[0] - 3, A_F[1]), "UC8")
assoc((A_D[0] - 3, A_D[1]), "UC14")


# ---- include / extend (flecha punteada de punta abierta) -------------------------------
def dashed_arrow(src, dst, label):
    cs, cd = uc[src], uc[dst]
    p0, p1 = edge(cs, (cd["x"], cd["y"])), edge(cd, (cs["x"], cs["y"]))
    ax.annotate("", xy=p1, xytext=p0, zorder=2,
                arrowprops=dict(arrowstyle="->", linestyle=(0, (3.2, 2.4)), lw=1.6, color=INK,
                                shrinkA=0, shrinkB=0, mutation_scale=17))
    ax.text(p0[0] + 4.2, (p0[1] + p1[1]) / 2, label, ha="left", va="center", fontsize=9.5, style="italic",
            fontweight="semibold", color=INK, zorder=5)


dashed_arrow("UC4", "UC2", "«include»")
dashed_arrow("UC6", "UC2", "«include»")
dashed_arrow("UC7", "UC6", "«include»")
dashed_arrow("UC8", "UC7", "«extend»")
dashed_arrow("UC14", "UC12", "«include»")

# ---- leyenda ------------------------------------------------------------------------------
lx, ly = 136, TOP + 12
ax.add_patch(FancyBboxPatch((lx, ly - 32), 38, 38, boxstyle="round,pad=0,rounding_size=1.4",
                            fc="white", ec="#C5CEDB", lw=1.2, zorder=1))
ax.text(lx + 19, ly + 2.5, "Simbología", ha="center", va="center", fontsize=10.5, fontweight="bold", color=INK)
ax.plot([lx + 3, lx + 11], [ly - 4, ly - 4], color=INK, lw=LW)
ax.text(lx + 14, ly - 4, "Asociación", va="center", fontsize=9.5, color=INK)
ax.annotate("", xy=(lx + 11, ly - 11), xytext=(lx + 3, ly - 11),
            arrowprops=dict(arrowstyle="->", linestyle=(0, (3.2, 2.4)), lw=1.6, color=INK, mutation_scale=15))
ax.text(lx + 14, ly - 11, "x «include» y", va="center", fontsize=9.5, color=INK)
ax.annotate("", xy=(lx + 3, ly - 18), xytext=(lx + 11, ly - 18),
            arrowprops=dict(arrowstyle="->", linestyle=(0, (3.2, 2.4)), lw=1.6, color=INK, mutation_scale=15))
ax.text(lx + 14, ly - 18, "x «extend» y", va="center", fontsize=9.5, color=INK)
ax.text(lx + 14, ly - 21.4, "(y apunta a x)", va="center", fontsize=8, color=MUTED, style="italic")
ax.plot([lx + 3, lx + 8.4], [ly - 27, ly - 27], color=INK, lw=LW)
ax.add_patch(plt.Polygon([(lx + 11.4, ly - 27), (lx + 8.2, ly - 28.9), (lx + 8.2, ly - 25.1)], closed=True,
                         fc="white", ec=INK, lw=LW, zorder=3))
ax.text(lx + 14, ly - 27, "Generalización", va="center", fontsize=9.5, color=INK)

ax.set_xlim(0, 176)
ax.set_ylim(Y_BOT - 14, Y_TOP + 5)
OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(str(OUT) + ".png", dpi=200, bbox_inches="tight", facecolor="white")
fig.savefig(str(OUT) + ".svg", bbox_inches="tight", facecolor="white")
print("OK", OUT)
