"""Shared settings for the Serpa geodata build (Web Mercator XYZ tiles)."""
import math, os

# Area of interest: concelho de Serpa (CAOP 2020: -7.6823, 37.7412, -7.2483, 38.1764) + margem
AOI = (-7.745, 37.700, -7.190, 38.220)  # lon_min, lat_min, lon_max, lat_max
# Área alargada para as vistas gerais (z8 a z12): o mapa não acaba num retângulo à volta do concelho.
WIDE = (-8.100, 37.500, -6.850, 38.420)
WIDE_MAX_Z = 12


def area_for(z):
    return WIDE if z <= WIDE_MAX_Z else AOI

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUBLIC = os.path.join(ROOT, 'public')
CACHE = os.environ.get('GEO_CACHE', os.path.join(ROOT, '.geo-cache'))
R = 6378137.0
ORIGIN = math.pi * R


def lon2x(lon):
    return math.radians(lon) * R


def lat2y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R


def x2lon(x):
    return math.degrees(x / R)


def y2lat(y):
    return math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)


def tile_range(z, aoi=AOI):
    n = 2 ** z
    def tx(lon):
        return int((lon + 180) / 360 * n)
    def ty(lat):
        lr = math.radians(lat)
        return int((1 - math.log(math.tan(lr) + 1 / math.cos(lr)) / math.pi) / 2 * n)
    return tx(aoi[0]), ty(aoi[3]), tx(aoi[2]), ty(aoi[1])  # x0, y0, x1, y1 (inclusive)


def tile_bounds_3857(z, x, y):
    size = 2 * ORIGIN / 2 ** z
    minx = -ORIGIN + x * size
    maxy = ORIGIN - y * size
    return minx, maxy - size, minx + size, maxy
