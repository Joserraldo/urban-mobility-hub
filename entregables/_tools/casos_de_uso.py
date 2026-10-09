"""Diagrama de casos de uso — plano maestro v2 (estilo documento técnico).

Simbología UML estricta:
  Actor      = monigote de palitos
  Caso de uso= óvalo
  Asociación = línea continua
  include    = flecha punteada, x --> y (x incluye a y, obligatorio)
  extend     = flecha punteada, y --> x (el que extiende apunta al base, opcional)
  herencia   = línea continua con triángulo hueco (subtipo --> supertipo)

Layout: columnas izquierda = casos por rol (Cliente / Operador / Domiciliario);
columna derecha = casos compartidos por todos (UC01/UC02), comercio (UC18),
máquina/notificación (UC19/UC20). Actores humanos a la izquierda, sistemas
externos a la derecha.

Uso:  python casos_de_uso.py  ->  ../analisis/img/01-casos-de-uso.(png|svg)
"""
import math
import textwrap
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Rectangle

OUT = Path(__file__).resolve().parent.parent / "analisis" / "img" / "01-casos-de-uso"

FONT = "Segoe UI"
INK = "#1B2A41"
MUTED = "#6B7A90"
SYS_BG = "#F7F9FC"
HEAD = "#1B2A41"
C_FILL, C_EDGE = "#E8F0FE", "#2F5DA8"          # cliente
O_FILL, O_EDGE = "#E6F4EF", "#2E7D63"          # operador
D_FILL, D_EDGE = "#FDF0E4", "#C77B28"          # domiciliario
S_FILL, S_EDGE = "#FFF4CC", "#A08A1E"          # compartido / comercio
M_FILL, M_EDGE = "#F0EBFA", "#6B4FA0"          # máquina / notificación
LW = 1.5

plt.rcParams["font.family"] = FONT
fig, ax = plt.subplots(figsize=(12.5, 17))
ax.set_aspect("equal")
ax.axis("off")

# ===================== rejilla de casos de uso =====================
W_L, W_R, H, STEP = 46, 40, 7.2, 13.4
CX_L, CX_R = 76, 126
TOP = 170

LEFT = [
    ("UC03", "Ver catálogo de venta", "c"),
    ("UC04", "Comprar vehículo", "c"),
    ("UC05", "Alquilar vehículo (hub o domicilio)", "c"),
    ("UC08", "Desbloquear vehículo (QR + casco)", "c"),
    ("UC09", "Desbloquear con rostro", "c"),
    ("UC06", "Ver flota y mapa multicapa", "c"),
    ("UC07", "Ver detalle de hub", "c"),
]
GAP = 12
LEFT += [
    ("UC10", "Ver KPIs y gemelos digitales", "o"),
    ("UC11", "Simular evento IoT", "o"),
    ("UC12", "Revisar bitácora de alertas", "o"),
    ("UC13", "Gestionar catálogo y hubs", "o"),
    ("UC14", "Asignar entrega a domiciliario", "o"),
]
LEFT += [
    ("UC15", "Ver entregas asignadas", "d"),
    ("UC16", "Realizar entrega de vehículo", "d"),
    ("UC17", "Marcar entrega tardía", "d"),
]

uc, y = {}, TOP
groups_seen = None
for k, t, g in LEFT:
    if groups_seen is not None and g != groups_seen:
        y -= GAP
    uc[k] = dict(x=CX_L, y=y, w=W_L, h=H, t=t, g=g)
    groups_seen = g
    y -= STEP

RIGHT = [
    ("UC18", "Realizar pago", "s"),
    ("UC02", "Iniciar o cerrar sesión", "s"),
    ("UC01", "Registrarse y dar consentimiento", "s"),
    ("UC20", "Reportar telemetría y alertas", "m"),
    ("UC19", "Notificar retraso por correo", "m"),
]
RY = {"UC18": 156.6, "UC02": 129.8, "UC01": 103.2, "UC20": 64, "UC19": -6}
for k, t, g in RIGHT:
    uc[k] = dict(x=CX_R, y=RY[k], w=W_R, h=H, t=t, g=g)

PAL = dict(c=(C_FILL, C_EDGE), o=(O_FILL, O_EDGE), d=(D_FILL, D_EDGE), s=(S_FILL, S_EDGE), m=(M_FILL, M_EDGE))

BX0, BX1 = 44, 150
Y_TOP, Y_BOT = TOP + 16, uc["UC17"]["y"] - 9


def edge(c, target):
    dx, dy = target[0] - c["x"], target[1] - c["y"]
    a, b = c["w"] / 2, c["h"] / 2
    d = math.sqrt((dx / a) ** 2 + (dy / b) ** 2) or 1
    return (c["x"] + dx / d, c["y"] + dy / d)


# ===================== frontera del sistema =====================
ax.add_patch(FancyBboxPatch((BX0, Y_BOT), BX1 - BX0, Y_TOP - Y_BOT, boxstyle="round,pad=0,rounding_size=1.6",
                            fc=SYS_BG, ec=INK, lw=1.6, zorder=0))
ax.add_patch(FancyBboxPatch((BX0, Y_TOP - 7), BX1 - BX0, 7, boxstyle="round,pad=0,rounding_size=1.6",
                            fc=HEAD, ec=HEAD, lw=1.6, zorder=1))
ax.add_patch(Rectangle((BX0, Y_TOP - 7), BX1 - BX0, 3.5, fc=HEAD, ec=HEAD, lw=0, zorder=1))
ax.text((BX0 + BX1) / 2, Y_TOP - 3.5, "Sistema: Plataforma de Micromovilidad UMH", ha="center", va="center",
        fontsize=14, fontweight="bold", color="white", zorder=2)

# separadores horizontales entre bloques de rol + columna compartida vertical
y_sep1 = (uc["UC09"]["y"] + uc["UC10"]["y"]) / 2
y_sep2 = (uc["UC14"]["y"] + uc["UC15"]["y"]) / 2
for ys in (y_sep1, y_sep2):
    ax.plot([BX0 + 2.5, 100.5], [ys, ys], color="#C5CEDB", lw=1.1, ls=(0, (4, 3)), zorder=1)
ax.plot([100.5, 100.5], [146, Y_BOT + 3], color="#C5CEDB", lw=1.1, ls=(0, (4, 3)), zorder=1)

ax.text(BX0 + 3.5, uc["UC03"]["y"] + H / 2 + 2.6, "FUNCIONES DEL CLIENTE", fontsize=8.6, color=C_EDGE,
        fontweight="bold", va="center", zorder=2)
ax.text(BX0 + 3.5, uc["UC10"]["y"] + H / 2 + 2.6, "OPERACIÓN Y TELEMETRÍA", fontsize=8.6, color=O_EDGE,
        fontweight="bold", va="center", zorder=2)
ax.text(BX0 + 3.5, uc["UC15"]["y"] + H / 2 + 2.6, "ENTREGA A DOMICILIO", fontsize=8.6, color=D_EDGE,
        fontweight="bold", va="center", zorder=2)
ax.text(102.5, uc["UC18"]["y"] + H / 2 + 3.4, "PARA LOS 3 ROLES / COMERCIO", fontsize=8.6, color=S_EDGE,
        fontweight="bold", va="center", zorder=2)
ax.text(102.5, uc["UC20"]["y"] + H / 2 + 3.4, "MÁQUINA Y NOTIFICACIÓN", fontsize=8.6, color=M_EDGE,
        fontweight="bold", va="center", zorder=2)

# ===================== óvalos =====================
for k, c in uc.items():
    fc, ec = PAL[c["g"]]
    ax.add_patch(Ellipse((c["x"], c["y"]), c["w"], c["h"], fc=fc, ec=ec, lw=1.7, zorder=3))
    ax.text(c["x"], c["y"], f"{k}\n" + "\n".join(textwrap.wrap(c["t"], 26)), ha="center", va="center",
            fontsize=9.2, fontweight="semibold", color=INK, zorder=4, linespacing=1.05)


# ===================== actores (monigotes) =====================
def actor(x, y, label, sub, color=INK, s=1.0):
    r, lw = 2.5 * s, 1.9
    ax.add_patch(Circle((x, y + 9 * s), r, fc="white", ec=color, lw=lw, zorder=3))
    ax.plot([x, x], [y + 9 * s - r, y + 1.4 * s], color=color, lw=lw, zorder=3, solid_capstyle="round")
    ax.plot([x - 2.7 * s, x, x + 2.7 * s], [y + 4.4 * s, y + 6.4 * s, y + 4.4 * s], color=color, lw=lw,
            zorder=3, solid_capstyle="round", solid_joinstyle="round")
    ax.plot([x - 2.4 * s, x, x + 2.4 * s], [y - 2.4 * s, y + 1.4 * s, y - 2.4 * s], color=color, lw=lw,
            zorder=3, solid_capstyle="round")
    ax.text(x, y - 4.8 * s, label, ha="center", va="top", fontsize=11.5, fontweight="bold", color=INK)
    ax.text(x, y - 4.8 * s - 2.9 * s * (label.count("\n") + 1), sub, ha="center", va="top", fontsize=9,
            color=MUTED, style="italic")
    return (x, y + 4 * s)


A_C = actor(14, 121, "Cliente", "persona", C_EDGE)
A_O = actor(14, (uc["UC11"]["y"] + uc["UC12"]["y"]) / 2, "Operador", "persona", O_EDGE)
A_D = actor(14, uc["UC16"]["y"] + 3.4, "Domiciliario", "persona", D_EDGE)

A_P = actor(172, uc["UC18"]["y"] + 4, "Pasarela de pagos", "sistema externo")
A_F = actor(172, uc["UC09"]["y"] - 4.4, "Servicio facial", "sistema externo")
A_M = actor(172, uc["UC04"]["y"] - 19.6, "API de Mapas", "OpenStreetMap")
A_B = actor(172, uc["UC19"]["y"] + 4, "API de correo", "Brevo")
A_V = actor(172, uc["UC20"]["y"] + 4, "Vehículo IoT", "gemelo digital")


# ===================== herencia de actores =====================
def hollow_triangle_arrow(x, y_from, y_to, color):
    th = 3.2
    ax.plot([x, x], [y_from, y_to - th], color=color, lw=LW, zorder=2, solid_capstyle="butt")
    ax.add_patch(plt.Polygon([(x, y_to), (x - th * 0.62, y_to - th), (x + th * 0.62, y_to - th)],
                             closed=True, fc="white", ec=color, lw=LW, zorder=3, joinstyle="miter"))


y_user_bottom = A_C[1] - 4 - 4.8 - 2.9 - 2.4
y_op_top = A_O[1] - 4 + 9 + 2.5 + 0.8
hollow_triangle_arrow(14, y_op_top, y_user_bottom, INK)
y_dom_top = A_D[1] - 4 + 9 + 2.5 + 0.8
hollow_triangle_arrow(2.5, y_dom_top, y_user_bottom, INK)
ax.text(4, (y_dom_top + y_user_bottom) / 2, "heredan", rotation=90, ha="right", va="center",
        fontsize=8, color=MUTED, style="italic")


# ===================== asociaciones =====================
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


trunk((A_C[0] + 3, A_C[1]), ["UC03", "UC04", "UC05", "UC08", "UC09", "UC06", "UC07"], 32, C_EDGE)
trunk((A_C[0] + 3, A_C[1]), ["UC01", "UC02"], 102, C_EDGE)
trunk((A_O[0] + 3, A_O[1]), ["UC10", "UC11", "UC12", "UC13", "UC14"], 32, O_EDGE)
trunk((A_D[0] + 3, A_D[1]), ["UC15", "UC16", "UC17"], 32, D_EDGE)
assoc((A_P[0] - 3, A_P[1]), "UC18")
assoc((A_F[0] - 3, A_F[1]), "UC09")
assoc((A_M[0] - 3, A_M[1]), "UC05")
assoc((A_M[0] - 3, A_M[1]), "UC06")
assoc((A_B[0] - 3, A_B[1]), "UC19")
assoc((A_V[0] - 3, A_V[1]), "UC20")


# ===================== include / extend =====================
def dashed_arrow(src, dst, label, rad=0.0, dx_lbl=0.0):
    cs, cd = uc[src], uc[dst]
    p0, p1 = edge(cs, (cd["x"], cd["y"])), edge(cd, (cs["x"], cs["y"]))
    ax.annotate("", xy=p1, xytext=p0, zorder=2,
                arrowprops=dict(arrowstyle="->", linestyle=(0, (3.2, 2.4)), lw=1.6, color=INK,
                                shrinkA=0, shrinkB=0, mutation_scale=17,
                                connectionstyle=f"arc3,rad={rad}"))
    mx, my = (p0[0] + p1[0]) / 2 + dx_lbl, (p0[1] + p1[1]) / 2
    ax.text(mx, my, label, ha="center", va="center", fontsize=9.2, style="italic",
            fontweight="semibold", color=INK, zorder=5,
            bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))


dashed_arrow("UC04", "UC18", "«include»")
dashed_arrow("UC05", "UC18", "«include»", rad=0.18, dx_lbl=2.5)
dashed_arrow("UC18", "UC02", "«include»", dx_lbl=10)
dashed_arrow("UC08", "UC05", "«include»", dx_lbl=12)
dashed_arrow("UC09", "UC08", "«extend»", dx_lbl=12)
dashed_arrow("UC17", "UC16", "«extend»", dx_lbl=12)
dashed_arrow("UC19", "UC17", "«extend»", rad=0.35, dx_lbl=9)
dashed_arrow("UC20", "UC12", "«include»", rad=0.22, dx_lbl=-6)

# nota: sesión requerida
ax.text(118, 84, "UC02 aplica a UC03–UC17 y UC20:\nsin sesión no hay dinero, flota ni\nidentidad. Se dibuja una sola vez\n(desde UC18) para no saturar el plano.",
        fontsize=8.2, color=INK, ha="center", va="center",
        bbox=dict(boxstyle="round,pad=0.5", fc="#FFF7CC", ec=MUTED, lw=1), zorder=6)

# ===================== leyenda =====================
lx, ly = 0, 208
ax.add_patch(FancyBboxPatch((lx, ly - 34), 40, 40, boxstyle="round,pad=0,rounding_size=1.4",
                            fc="white", ec="#C5CEDB", lw=1.2, zorder=1))
ax.text(lx + 20, ly + 3, "Simbología", ha="center", va="center", fontsize=10.5, fontweight="bold", color=INK)
ax.plot([lx + 3, lx + 11], [ly - 4, ly - 4], color=INK, lw=LW)
ax.text(lx + 14, ly - 4, "Asociación", va="center", fontsize=9.2, color=INK)
ax.annotate("", xy=(lx + 11, ly - 10.5), xytext=(lx + 3, ly - 10.5),
            arrowprops=dict(arrowstyle="->", linestyle=(0, (3.2, 2.4)), lw=1.6, color=INK, mutation_scale=15))
ax.text(lx + 14, ly - 10.5, "x «include» y  (obligatorio)", va="center", fontsize=9.2, color=INK)
ax.annotate("", xy=(lx + 3, ly - 17), xytext=(lx + 11, ly - 17),
            arrowprops=dict(arrowstyle="->", linestyle=(0, (3.2, 2.4)), lw=1.6, color=INK, mutation_scale=15))
ax.text(lx + 14, ly - 17, "x «extend» y  (opcional;\nla flecha va de x al óvalo y)", va="center",
        fontsize=9.2, color=INK)
ax.plot([lx + 3, lx + 8.4], [ly - 25, ly - 25], color=INK, lw=LW)
ax.add_patch(plt.Polygon([(lx + 11.4, ly - 25), (lx + 8.2, ly - 26.9), (lx + 8.2, ly - 23.1)], closed=True,
                         fc="white", ec=INK, lw=LW, zorder=3))
ax.text(lx + 14, ly - 25, "Generalización\n(subtipo apunta al padre)", va="center", fontsize=9.2, color=INK)
ax.text(lx + 3, ly - 31.5, "● colores: azul cliente, verde operador,\nnaranja domiciliario, dorado común, violeta máquina",
        va="center", fontsize=8, color=MUTED, style="italic")

ax.set_xlim(-2, 196)
ax.set_ylim(Y_BOT - 6, 216)
OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(str(OUT) + ".png", dpi=200, bbox_inches="tight", facecolor="white")
fig.savefig(str(OUT) + ".svg", bbox_inches="tight", facecolor="white")
print("OK", OUT)
