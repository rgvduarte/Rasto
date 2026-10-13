"""Dados do modo de jogo.

Saídas:
  public/data/hex.json         grelha de hexágonos (aresta 150 m) dentro do concelho de Serpa, com a freguesia de cada célula
  public/data/sim-routes.json  trajetos para o modo de demonstração, calculados sobre a rede de ruas e estradões do OSM

Grelha: hexágonos "pointy-top" em coordenadas axiais (q, r), num plano local equirretangular centrado em REF.
O browser usa exatamente a mesma conta (src/lib/hex.ts) para saber em que célula está o jogador.
"""
import json, math, os
import numpy as np
import pyarrow.parquet as pq
import networkx as nx
from shapely import wkb
from shapely.geometry import shape, Point, LineString
from shapely.prepared import prep
from common import ROOT, PUBLIC, CACHE

EDGE = 150.0
REF = (-7.465, 37.958)  # perto do centro do concelho
KX = 111320.0 * math.cos(math.radians(REF[1]))
KY = 110574.0
SQ3 = math.sqrt(3)

CAOP = os.path.join(ROOT, 'node_modules', '@cartography', 'pt', 'dist')
mun = json.load(open(os.path.join(CAOP, 'municipalities.json')))['features']
serpa = shape([f for f in mun if f['properties']['name'] == 'Serpa'][0]['geometry']).buffer(0)
SHORT = {
    'União das freguesias de Serpa (Salvador e Santa Maria)': 'Serpa (Salvador e Santa Maria)',
    'União das freguesias de Vila Nova de São Bento e Vale de Vargo': 'Vila Nova de São Bento e Vale de Vargo',
}
par = [f for f in json.load(open(os.path.join(CAOP, 'parishes.json')))['features'] if serpa.contains(shape(f['geometry']).representative_point())]
FREG = [(SHORT.get(f['properties']['name'], f['properties']['name']), prep(shape(f['geometry']).buffer(0))) for f in par]


def to_xy(lon, lat):
    return (lon - REF[0]) * KX, (lat - REF[1]) * KY


def to_ll(x, y):
    return REF[0] + x / KX, REF[1] + y / KY


# ---------- grelha ----------
minx, miny, maxx, maxy = serpa.bounds
x0, y0 = to_xy(minx, miny)
x1, y1 = to_xy(maxx, maxy)
r_min = int(math.floor(y0 / (1.5 * EDGE))) - 1
r_max = int(math.ceil(y1 / (1.5 * EDGE))) + 1
P = prep(serpa)
cells = []
for r in range(r_min, r_max + 1):
    cy = 1.5 * EDGE * r
    q_min = int(math.floor(x0 / (SQ3 * EDGE) - r / 2)) - 1
    q_max = int(math.ceil(x1 / (SQ3 * EDGE) - r / 2)) + 1
    for q in range(q_min, q_max + 1):
        cx = SQ3 * EDGE * (q + r / 2)
        lon, lat = to_ll(cx, cy)
        pt = Point(lon, lat)
        if P.contains(pt):
            f = next((i for i, (_, g) in enumerate(FREG) if g.contains(pt)), -1)
            cells.append((q, r, f))
out = {
    'ref': REF, 'edge': EDGE, 'kx': round(KX, 3), 'ky': KY,
    'freguesias': [n for n, _ in FREG],
    'cells': [v for c in cells for v in c],
}
with open(os.path.join(PUBLIC, 'data', 'hex.json'), 'w') as fh:
    json.dump(out, fh, separators=(',', ':'))
print('hex cells', len(cells), os.path.getsize(os.path.join(PUBLIC, 'data', 'hex.json')) // 1024, 'KB')

# ---------- rede de ruas e estradões (OSM via Overture) ----------
SPEED = {'trunk': 80, 'primary': 70, 'secondary': 60, 'tertiary': 50, 'minor': 30, 'service': 15, 'track': 25,
         'path': 4, 'pedestrian': 4, 'living_street': 15}
seg = pq.read_table(os.path.join(CACHE, 'overture', 'segments.parquet'), columns=['subtype', 'class', 'geometry', 'road_surface']).to_pylist()
KIND = {'motorway': 'trunk', 'trunk': 'trunk', 'primary': 'primary', 'secondary': 'secondary', 'tertiary': 'tertiary',
        'residential': 'minor', 'unclassified': 'minor', 'living_street': 'minor', 'unknown': 'minor', 'service': 'service',
        'track': 'track', 'path': 'path', 'footway': 'path', 'pedestrian': 'pedestrian', 'steps': 'path', 'cycleway': 'path'}


def key(c):
    return (round(c[0], 6), round(c[1], 6))


def build_graph(mode):
    G = nx.Graph()
    for s in seg:
        if s['subtype'] != 'road':
            continue
        k = KIND.get(s['class'], 'minor')
        if mode == 'carro' and k in ('path', 'pedestrian'):
            continue
        g = wkb.loads(s['geometry'])
        lines = [g] if g.geom_type == 'LineString' else list(g.geoms)
        for ln in lines:
            cs = list(ln.coords)
            for a, b in zip(cs[:-1], cs[1:]):
                ax, ay = to_xy(*a)
                bx, by = to_xy(*b)
                d = math.hypot(bx - ax, by - ay)
                if mode == 'pe':
                    w = d * (1.6 if k in ('trunk', 'primary') else 1.0)
                elif mode == 'estradoes':
                    w = d * (0.55 if k == 'track' else 1.0 if k in ('minor', 'service', 'path') else 2.2)
                else:
                    w = d / SPEED[k]
                G.add_edge(key(a), key(b), w=w, d=d)
    return G


def nearest_node(G, nodes_xy, lon, lat):
    x, y = to_xy(lon, lat)
    i = int(np.argmin((nodes_xy[:, 0] - x) ** 2 + (nodes_xy[:, 1] - y) ** 2))
    return list(G.nodes)[i]


pois = {p['id']: p for p in json.load(open(os.path.join(ROOT, 'src', 'data', 'pois.json')))}

ROUTES = [
    ('centro-a-pe', 'Centro histórico a pé', 'pe', 4.5,
     ['o-alentejano', 'igreja-santa-maria', 'castelo-serpa', 'torre-relogio-serpa', 'palacio-ficalho', 'aqueduto-serpa',
      'convento-sao-paulo', 'museu-etnografico', 'museu-relogio', 'casa-do-cante', 'o-alentejano']),
    ('estradoes-pias', 'De Pias a Vale de Vargo pelos estradões', 'estradoes', 14,
     ['torre-relogio-pias', 'barragem-enxoe', 'monte-das-louzeiras', 'igreja-sao-sebastiao-vvargo']),
    ('corrida-sao-gens', 'Corrida ao Alto de São Gens', 'pe', 10,
     ['castelo-serpa', 'ermida-guadalupe', 'castelo-serpa']),
]

# ---------- altitude (Copernicus DEM, grelha z12 da AOI) ----------
DEM = np.load(os.path.join(CACHE, 'dem_3857_z12.npy'))
DMETA = json.load(open(os.path.join(CACHE, 'dem_3857_z12.json')))
_a, _b, _c, _d, _e, _f = DMETA['transform']
R = 6378137.0


def elev(lon, lat):
    x = math.radians(lon) * R
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R
    col = (x - _c) / _a - 0.5
    row = (y - _f) / _e - 0.5
    c0, r0 = int(math.floor(col)), int(math.floor(row))
    fx, fy = col - c0, row - r0
    v = DEM[r0:r0 + 2, c0:c0 + 2]
    return float(v[0, 0] * (1 - fx) * (1 - fy) + v[0, 1] * fx * (1 - fy) + v[1, 0] * (1 - fx) * fy + v[1, 1] * fx * fy)


def resample(coords, step=20.0):
    """Pontos a cada `step` metros, com distância acumulada e altitude."""
    out = [(coords[0][0], coords[0][1], 0.0)]
    acc = 0.0
    carry = 0.0
    for (alon, alat), (blon, blat) in zip(coords[:-1], coords[1:]):
        ax, ay = to_xy(alon, alat)
        bx, by = to_xy(blon, blat)
        d = math.hypot(bx - ax, by - ay)
        t = step - carry
        while t <= d:
            f = t / d
            out.append((alon + (blon - alon) * f, alat + (blat - alat) * f, acc + t))
            t += step
        carry = d - (t - step)
        acc += d
    out.append((coords[-1][0], coords[-1][1], acc))
    return out


def smooth(v, k=5):
    v = np.asarray(v, float)
    if len(v) < k:
        return v
    pad = np.pad(v, (k // 2, k // 2), mode='edge')
    return np.convolve(pad, np.ones(k) / k, mode='valid')


def gain_of(e):
    e = smooth(e)
    g = 0.0
    for a, b in zip(e[:-1], e[1:]):
        if b > a:
            g += b - a
    return g

routes = []
graphs = {}
for rid, name, mode, kmh, stops in ROUTES:
    if mode not in graphs:
        G = build_graph(mode)
        # só a maior componente ligada
        big = max(nx.connected_components(G), key=len)
        G = G.subgraph(big).copy()
        xy = np.array([to_xy(*n) for n in G.nodes])
        graphs[mode] = (G, xy)
    G, xy = graphs[mode]
    coords = []
    for a, b in zip(stops[:-1], stops[1:]):
        na = nearest_node(G, xy, pois[a]['lon'], pois[a]['lat'])
        nb = nearest_node(G, xy, pois[b]['lon'], pois[b]['lat'])
        path = nx.shortest_path(G, na, nb, weight='w')
        if coords:
            path = path[1:]
        coords += [list(p) for p in path]
    line = LineString(coords)
    length = sum(math.hypot(*(np.subtract(to_xy(*coords[i + 1]), to_xy(*coords[i])))) for i in range(len(coords) - 1))
    pts = resample(coords, 20.0)
    ele = [elev(lo, la) for lo, la, _ in pts]
    routes.append({'id': rid, 'name': name, 'mode': {'pe': 'a pé', 'estradoes': 'de bicicleta', 'carro': 'de carro'}[mode],
                   'kmh': kmh, 'km': round(length / 1000, 2), 'stops': stops, 'gain': round(gain_of(ele)),
                   'pts': [[round(lo, 6), round(la, 6), round(d), round(e, 1)] for (lo, la, d), e in zip(pts, ele)]})
    print(f'{rid:16} {length/1000:6.2f} km  {len(pts)} pontos  D+ {gain_of(ele):.0f} m')

# ---------- segmentos (troços de rotas reais, como no Strava) ----------
SEGMENTS = [
    # id, nome, rota, do ponto (id) ao ponto (id) - dentro da rota
    ('subida-sao-gens', 'Subida ao Alto de São Gens', 'corrida-sao-gens', 'castelo-serpa', 'ermida-guadalupe'),
    ('estradao-enxoe', 'Estradão do Enxoé', 'estradoes-pias', 'barragem-enxoe', 'monte-das-louzeiras'),
    ('ruas-do-castelo', 'Ruas do castelo', 'centro-a-pe', 'o-alentejano', 'palacio-ficalho'),
]


def nearest_idx(pts, lon, lat, start=0):
    best, bi = 1e18, start
    for i in range(start, len(pts)):
        x, y = to_xy(pts[i][0], pts[i][1])
        px, py = to_xy(lon, lat)
        d = (x - px) ** 2 + (y - py) ** 2
        if d < best:
            best, bi = d, i
    return bi


segments = []
rmap = {r['id']: r for r in routes}
for sid, name, rid, a, b in SEGMENTS:
    pts = rmap[rid]['pts']
    i = nearest_idx(pts, pois[a]['lon'], pois[a]['lat'])
    j = nearest_idx(pts, pois[b]['lon'], pois[b]['lat'], i + 1)
    sub = pts[i:j + 1]
    dist = sub[-1][2] - sub[0][2]
    ele = [p[3] for p in sub]
    g = gain_of(ele)
    es = smooth(ele)
    grades = [(es[k + 5] - es[k]) / (sub[k + 5][2] - sub[k][2]) * 100 for k in range(0, len(sub) - 5) if sub[k + 5][2] > sub[k][2]]
    segments.append({'id': sid, 'name': name, 'route': rid, 'km': round(dist / 1000, 2), 'gain': round(g),
                     'grade': round((ele[-1] - ele[0]) / dist * 100, 1) if dist else 0,
                     'maxGrade': round(max(grades), 1) if grades else 0,
                     'pts': [[p[0], p[1], p[2] - sub[0][2], p[3]] for p in sub]})
    print(f'segmento {sid:18} {dist/1000:5.2f} km  D+ {g:4.0f} m  inclinação média {(ele[-1]-ele[0])/dist*100:4.1f}%')
with open(os.path.join(PUBLIC, 'data', 'sim-routes.json'), 'w') as fh:
    json.dump({'note': 'Trajetos de simulação e segmentos calculados sobre a rede do OpenStreetMap (via Overture), com altitude do Copernicus DEM. Não são percursos oficiais.',
               'routes': routes, 'segments': segments}, fh, ensure_ascii=False, separators=(',', ':'))
