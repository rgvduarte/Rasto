"""Constrói as camadas vetoriais do mapa a partir de dados abertos.

Saídas:
  .geo-cache/layers/<camada>.geojson   entrada do tiler (scripts/tiles/build-vector-tiles.mjs)
  public/data/territory.json           concelho, freguesias, máscara e povoações (para a interface)

Fontes:
  CAOP 2020, Direção-Geral do Território (pacote npm @cartography/pt)
  Overture Maps 2026-09-23.1 (transportes, água, uso do solo, edifícios, divisões), extraído com overture_extract.py
  Copernicus DEM GLO-30 (curvas de nível, a partir de .geo-cache/dem_3857_z12.npy gerado por build_rasters.py)
"""
import json, os, math
import numpy as np
import pyarrow.parquet as pq
from shapely import wkb
from shapely.geometry import shape, mapping, box, LineString, MultiLineString, Point
from shapely.ops import unary_union, linemerge
from scipy import ndimage
import contourpy
from common import AOI, WIDE, ROOT, PUBLIC, CACHE, x2lon, y2lat

OUT = os.path.join(CACHE, 'layers')
os.makedirs(OUT, exist_ok=True)
CLIP = box(*AOI)
WIDE_BOX = box(*WIDE)
RING = WIDE_BOX.difference(CLIP)  # só a coroa fora da AOI (vista geral)
CAOP = os.path.join(ROOT, 'node_modules', '@cartography', 'pt', 'dist')
OVT = os.path.join(CACHE, 'overture')
OVT_WIDE = os.path.join(CACHE, 'overture-wide')


def r5(geom):
    """Arredonda coordenadas a 5 casas (≈1 m) para encolher os ficheiros."""
    g = mapping(geom)
    def rnd(c):
        if isinstance(c[0], (float, int)):
            return [round(c[0], 5), round(c[1], 5)]
        return [rnd(x) for x in c]
    g['coordinates'] = rnd(g['coordinates'])
    return g


def feat(geom, **props):
    return {'type': 'Feature', 'properties': {k: v for k, v in props.items() if v is not None}, 'geometry': r5(geom)}


def write(name, feats):
    with open(os.path.join(OUT, name + '.geojson'), 'w') as f:
        json.dump({'type': 'FeatureCollection', 'features': feats}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{name:10} {len(feats):6} features')


def clip(g, area=CLIP):
    if not g.intersects(area):
        return None
    g = g.intersection(area)
    return None if g.is_empty else g


def name_of(r):
    n = r.get('names') or {}
    return n.get('primary')


# ---------- limites (CAOP) ----------
mun = json.load(open(os.path.join(CAOP, 'municipalities.json')))['features']
par = json.load(open(os.path.join(CAOP, 'parishes.json')))['features']
near = [f for f in mun if shape(f['geometry']).intersects(WIDE_BOX.buffer(0.3))]
serpa = shape([f for f in mun if f['properties']['name'] == 'Serpa'][0]['geometry']).buffer(0)
portugal_here = unary_union([shape(f['geometry']).buffer(0) for f in near])

SHORT = {
    'União das freguesias de Serpa (Salvador e Santa Maria)': 'Serpa (Salvador e Santa Maria)',
    'União das freguesias de Vila Nova de São Bento e Vale de Vargo': 'Vila Nova de São Bento e Vale de Vargo',
}
freg = [f for f in par if serpa.contains(shape(f['geometry']).representative_point())]

boundary = []
# fronteira com Espanha: contorno do conjunto dos concelhos portugueses, dentro da AOI
border = clip(portugal_here.boundary, WIDE_BOX)
if border is not None:
    boundary.append(feat(border.simplify(0.00003), kind='country'))
for f in near:
    g = shape(f['geometry']).buffer(0)
    nm = f['properties']['name']
    lines = clip(g.boundary.difference(portugal_here.boundary.buffer(0.0004)), WIDE_BOX)
    if lines is not None:
        boundary.append(feat(lines.simplify(0.00003), kind='serpa' if nm == 'Serpa' else 'concelho', name=nm))
for f in freg:
    g = shape(f['geometry']).buffer(0)
    inner = g.boundary.difference(serpa.boundary.buffer(0.0004))
    if not inner.is_empty:
        boundary.append(feat(inner.simplify(0.00003), kind='freguesia', name=SHORT.get(f['properties']['name'], f['properties']['name'])))
write('boundary', boundary)

# ---------- água ----------
wt = pq.read_table(os.path.join(OVT, 'water.parquet')).to_pylist()
water, waterway = [], []
for r in wt:
    g = clip(wkb.loads(r['geometry']))
    if g is None:
        continue
    cls = r['class']
    nm = name_of(r)
    if g.geom_type in ('Polygon', 'MultiPolygon'):
        if cls in ('swimming_pool', 'reflecting_pool', 'wastewater'):
            continue
        g = g.simplify(0.00002)
        if g.area < 2e-8:  # < ~200 m², sem interesse a esta escala
            continue
        kind = 'river' if cls in ('river', 'canal') else ('reservoir' if cls in ('reservoir', 'basin') else ('pond' if cls == 'pond' else 'water'))
        water.append(feat(g, kind=kind, name=nm, area=round(g.area * 1e6, 3)))
    elif g.geom_type in ('LineString', 'MultiLineString'):
        if cls in ('drain', 'ditch'):
            kind = 'ditch'
        elif cls == 'canal':
            kind = 'canal'
        elif cls == 'river':
            kind = 'river'
        else:
            kind = 'stream'
        waterway.append(feat(g.simplify(0.00002), kind=kind, name=nm, intermittent=bool(r.get('is_intermittent')) or None))
for r in pq.read_table(os.path.join(OVT_WIDE, 'water.parquet')).to_pylist():
    g = clip(wkb.loads(r['geometry']), RING)
    if g is None:
        continue
    cls = r['class']
    if g.geom_type in ('Polygon', 'MultiPolygon'):
        g = g.simplify(0.00005)
        if cls in ('river', 'canal', 'reservoir', 'lake', 'water', 'basin') and g.area > 5e-7:
            water.append(feat(g, kind='river' if cls in ('river', 'canal') else 'reservoir', name=name_of(r), area=round(g.area * 1e6, 3)))
    elif g.geom_type in ('LineString', 'MultiLineString') and (cls == 'river' or (cls == 'stream' and name_of(r))):
        waterway.append(feat(g.simplify(0.00005), kind='river' if cls == 'river' else 'stream', name=name_of(r)))
write('water', water)
write('waterway', waterway)

# ---------- estradas e caminhos ----------
ROAD_KIND = {
    'motorway': 'trunk', 'trunk': 'trunk', 'primary': 'primary', 'secondary': 'secondary', 'tertiary': 'tertiary',
    'residential': 'minor', 'unclassified': 'minor', 'living_street': 'minor', 'unknown': 'minor',
    'service': 'service', 'track': 'track',
    'path': 'path', 'footway': 'path', 'pedestrian': 'pedestrian', 'steps': 'path', 'cycleway': 'path',
}
sg = pq.read_table(os.path.join(OVT, 'segments.parquet')).to_pylist()
road, rail = [], []
for r in sg:
    g = clip(wkb.loads(r['geometry']))
    if g is None:
        continue
    if r['subtype'] == 'rail':
        rail.append(feat(g.simplify(0.00001), kind='rail'))
        continue
    kind = ROAD_KIND.get(r['class'], 'minor')
    if r.get('subclass') in ('driveway', 'parking_aisle'):
        kind = 'service'
    surf = None
    for s in r.get('road_surface') or []:
        if s.get('between') is None:
            surf = s.get('value')
    unpaved = surf in ('unpaved', 'dirt', 'gravel', 'ground', 'sand') or (kind == 'track' and surf not in ('paved', 'asphalt'))
    ref = None
    for rt in r.get('routes') or []:
        if rt.get('ref'):
            ref = rt['ref'].replace('EN ', 'N').replace('IP ', 'IP').replace('ER ', 'R').replace('EM ', 'M')
            break
    road.append(feat(g.simplify(0.00001), kind=kind, name=name_of(r), ref=ref, unpaved=True if unpaved else None))
for r in pq.read_table(os.path.join(OVT_WIDE, 'segments.parquet')).to_pylist():
    if r['subtype'] != 'road' or r['class'] not in ('motorway', 'trunk', 'primary', 'secondary', 'tertiary'):
        continue
    g = clip(wkb.loads(r['geometry']), RING)
    if g is None:
        continue
    ref = None
    for rt in r.get('routes') or []:
        if rt.get('ref'):
            ref = rt['ref'].replace('EN ', 'N').replace('IP ', 'IP').replace('ER ', 'R').replace('EM ', 'M')
            break
    road.append(feat(g.simplify(0.00003), kind=ROAD_KIND.get(r['class'], 'minor'), name=name_of(r), ref=ref))
write('road', road)
write('rail', rail)

# ---------- edifícios ----------
bd = pq.read_table(os.path.join(OVT, 'buildings.parquet'), columns=['geometry', 'class', 'names']).to_pylist()
building = []
for r in bd:
    g = wkb.loads(r['geometry'])
    if not CLIP.contains(g.centroid):
        continue
    building.append(feat(g.simplify(0.000006), kind=r['class'] or None))
write('building', building)

# ---------- uso do solo com interesse para o mapa ----------
lu = pq.read_table(os.path.join(OVT, 'landuse.parquet')).to_pylist()
landuse = []
KEEP_LU = {'cemetery': 'cemetery', 'pitch': 'sport', 'park': 'park', 'village_green': 'park', 'garden': 'park',
           'industrial': 'industrial', 'quarry': 'quarry', 'school': 'school', 'plaza': 'plaza'}
for r in lu:
    if r['subtype'] == 'protected':
        continue
    k = KEEP_LU.get(r['class'])
    if not k:
        continue
    g = clip(wkb.loads(r['geometry']))
    if g is None or g.geom_type not in ('Polygon', 'MultiPolygon'):
        continue
    landuse.append(feat(g.simplify(0.00001), kind=k, name=name_of(r)))
write('landuse', landuse)

protected = []
for r in lu:
    if r['subtype'] != 'protected':
        continue
    nm = name_of(r)
    if nm not in ('Parque Natural do Vale do Guadiana',):
        continue
    g = clip(wkb.loads(r['geometry']))
    if g is not None:
        protected.append(feat(g.simplify(0.00005), kind='parque', name=nm))
write('protected', protected)

# ---------- curvas de nível (Copernicus DEM) ----------
dem = np.load(os.path.join(CACHE, 'dem_3857_z12.npy'))
meta = json.load(open(os.path.join(CACHE, 'dem_3857_z12.json')))
a, b, c, d, e, f = meta['transform']
sm = ndimage.gaussian_filter(dem.astype(np.float64), 1.4)
gen = contourpy.contour_generator(z=sm, line_type='Separate')
contour = []
for level in range(20, 620, 20):
    for seg in gen.lines(level):
        if len(seg) < 6:
            continue
        xs = c + seg[:, 0] * a
        ys = f + seg[:, 1] * e
        coords = [(x2lon(x), y2lat(y)) for x, y in zip(xs, ys)]
        line = clip(LineString(coords).simplify(0.00006))
        if line is None or line.length < 0.003:
            continue
        contour.append(feat(line, ele=level, idx=1 if level % 100 == 0 else 0))
write('contour', contour)

# ---------- povoações ----------
dv = pq.read_table(os.path.join(OVT, 'divisions.parquet')).to_pylist()
RENAME = {'Aldeia do Pinto': 'A-do-Pinto', 'Serpa (Salvador e Santa Maria)': 'Serpa'}
RANK = {'city': 1, 'town': 2, 'village': 3, 'hamlet': 4}
places = []
seen = set()
for r in dv:
    if r['subtype'] != 'locality':
        continue
    nm = RENAME.get(name_of(r), name_of(r))
    if nm in ('Salvada e Quintos', 'Moura (Santo Agostinho e São João Batista) e Santo Amador') or nm in seen:
        continue
    g = wkb.loads(r['geometry'])
    if not CLIP.contains(g):
        continue
    rank = 1 if nm == 'Serpa' else RANK.get(r['class'] or '', 3)
    if nm == 'Moura':
        rank = 2
    seen.add(nm)
    inside = serpa.contains(g)
    places.append({'name': nm, 'lat': round(g.y, 5), 'lon': round(g.x, 5), 'rank': rank,
                   'pop': r.get('population'), 'inSerpa': inside, 'country': r.get('country')})
for r in pq.read_table(os.path.join(OVT_WIDE, 'divisions.parquet')).to_pylist():
    if r['subtype'] != 'locality' or (r['class'] or '') not in ('city', 'town', 'village'):
        continue
    g = wkb.loads(r['geometry'])
    nm = name_of(r)
    if CLIP.contains(g) or not WIDE_BOX.contains(g) or nm in seen:
        continue
    seen.add(nm)
    places.append({'name': nm, 'lat': round(g.y, 5), 'lon': round(g.x, 5), 'rank': RANK.get(r['class'], 3),
                   'pop': r.get('population'), 'inSerpa': False, 'country': r.get('country')})
write('place', [feat(Point(p['lon'], p['lat']), name=p['name'], rank=p['rank'], serpa=1 if p['inSerpa'] else 0) for p in places])

# ---------- dados da interface ----------
mask = box(AOI[0] - 0.5, AOI[1] - 0.5, AOI[2] + 0.5, AOI[3] + 0.5).difference(serpa)
from pyproj import Geod
geod = Geod(ellps='WGS84')
territory = {
    'source': 'CAOP 2020 (DGT); Overture Maps 2026-09-23.1; Copernicus DEM GLO-30; ESA WorldCover 2021',
    'aoi': AOI,
    'concelho': {
        'name': 'Serpa',
        'areaKm2': round(abs(geod.geometry_area_perimeter(serpa)[0]) / 1e6, 1),
        'bbox': [round(v, 4) for v in serpa.bounds],
        'geometry': r5(serpa.simplify(0.0002)),
    },
    'freguesias': [{
        'name': SHORT.get(fp['properties']['name'], fp['properties']['name']),
        'areaKm2': round(abs(geod.geometry_area_perimeter(shape(fp['geometry']))[0]) / 1e6, 1),
        'geometry': r5(shape(fp['geometry']).buffer(0).simplify(0.0002)),
    } for fp in freg],
    'mask': r5(mask.simplify(0.0002)),
    'places': sorted(places, key=lambda p: (p['rank'], p['name'])),
    'elevation': {'min': round(float(dem.min())), 'max': round(float(dem.max()))},
}
os.makedirs(os.path.join(PUBLIC, 'data'), exist_ok=True)
with open(os.path.join(PUBLIC, 'data', 'territory.json'), 'w') as fh:
    json.dump(territory, fh, ensure_ascii=False, separators=(',', ':'))
print('territory.json', os.path.getsize(os.path.join(PUBLIC, 'data', 'territory.json')) // 1024, 'KB')
