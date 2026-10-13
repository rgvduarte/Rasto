"""Builds raster tiles for the map from open data:
  - public/tiles/dem/{z}/{x}/{y}.png    Terrarium-encoded elevation (Copernicus DEM GLO-30), z8-z12
  - public/tiles/cover/{z}/{x}/{y}.webp ESA WorldCover 2021 land cover, coloured, z8-z14
  - .geo-cache/dem_3857.npy             elevation grid used for profiles and contours

Inputs (download once into GEO_CACHE):
  Copernicus_DSM_COG_10_N37_00_W008_00_DEM.tif, Copernicus_DSM_COG_10_N38_00_W008_00_DEM.tif
    https://copernicus-dem-30m.s3.amazonaws.com/<name>/<name>.tif
  ESA_WorldCover_10m_2021_v200_N36W009_Map.tif
    https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/<name>
"""
import os, json, math
import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from PIL import Image
from scipy import ndimage
from common import AOI, WIDE, PUBLIC, CACHE, tile_range, tile_bounds_3857, area_for

def mosaic_extent(z, area=None):
    x0, y0, x1, y1 = tile_range(z, area or area_for(z))
    a = tile_bounds_3857(z, x0, y1)
    b = tile_bounds_3857(z, x1, y0)
    return (x0, y0, x1, y1), (a[0], a[1], b[2], b[3])

def warp_to(src_ds_list, z, resampling, dtype, nodata, area=None):
    (x0, y0, x1, y1), (minx, miny, maxx, maxy) = mosaic_extent(z, area)
    w = (x1 - x0 + 1) * 256; h = (y1 - y0 + 1) * 256
    dst = np.full((h, w), nodata, dtype=dtype)
    tr = from_bounds(minx, miny, maxx, maxy, w, h)
    for ds in src_ds_list:
        tmp = np.full((h, w), nodata, dtype=dtype)
        reproject(rasterio.band(ds, 1), tmp, dst_transform=tr, dst_crs='EPSG:3857', resampling=resampling,
                  src_nodata=ds.nodata, dst_nodata=nodata)
        m = tmp != nodata
        dst[m] = tmp[m]
    return dst, (x0, y0, x1, y1), tr

def write_tiles(img, rng, z, folder, ext, keep=None, save=None):
    x0, y0, x1, y1 = rng
    n = 0
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            if keep is not None and not keep(z, tx, ty): continue
            sub = img[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256]
            d = os.path.join(folder, str(z), str(tx)); os.makedirs(d, exist_ok=True)
            save(sub, os.path.join(d, f'{ty}.{ext}')); n += 1
    return n

# ---------- DEM ----------
def build_dem():
    names = [f'Copernicus_DSM_COG_10_N{la}_00_W00{lo}_00_DEM.tif' for la in (37, 38) for lo in (7, 8, 9)]
    dss = [rasterio.open(os.path.join(CACHE, n)) for n in names]
    out = os.path.join(PUBLIC, 'tiles', 'dem')
    total = 0
    stats = {}
    for z in range(8, 13):
        dem, rng, tr = warp_to(dss, z, Resampling.bilinear if z == 12 else Resampling.average, np.float32, -9999.0,
                               area=AOI if z == 12 else WIDE)
        dem[dem == -9999.0] = 0
        if z == 12:
            # grelha da AOI (curvas de nível e números do concelho)
            dem_a, _, tr_a = warp_to(dss, 12, Resampling.bilinear, np.float32, -9999.0, area=AOI)
            dem_a[dem_a == -9999.0] = 0
            np.save(os.path.join(CACHE, 'dem_3857_z12.npy'), dem_a)
            json.dump({'transform': list(tr_a)[:6], 'shape': dem_a.shape}, open(os.path.join(CACHE, 'dem_3857_z12.json'), 'w'))
            stats = {'min': float(dem_a.min()), 'max': float(dem_a.max())}
        q = np.round((dem + 32768) * 4) / 4  # 0.25 m steps compress better
        r = np.floor(q / 256); g = np.floor(q - r * 256); b = np.round((q - np.floor(q)) * 256)
        rgb = np.dstack([r, g, b]).clip(0, 255).astype(np.uint8)
        total += write_tiles(rgb, rng, z, out, 'png', save=lambda a, p: Image.fromarray(a, 'RGB').save(p, optimize=True))
    print('dem tiles', total, stats)

# ---------- land cover ----------
# ESA WorldCover classes -> colours (papel quente, montado, restolho de verão)
COLORS = {
    0: (243, 239, 230),   # sem dados
    10: (176, 190, 146),  # árvores (montado, olival)
    20: (205, 205, 160),  # matos
    30: (232, 226, 190),  # pastagem
    40: (240, 229, 196),  # cultura (cereal, regadio)
    50: (214, 205, 196),  # construído
    60: (238, 231, 218),  # solo nu
    80: (143, 184, 204),  # água permanente
    90: (190, 211, 196),  # zona húmida herbácea
    95: (190, 211, 196), 100: (225, 225, 210), 70: (250, 250, 250),
}

def colour_mosaic(ds, z, area):
    cls, rng, tr = warp_to([ds], z, Resampling.nearest, np.uint8, 0, area=area)
    # filtro de maioria 3x3 para tirar o ruído de pixel isolado
    best = np.zeros(cls.shape, np.float32); out = cls.copy()
    for v in np.unique(cls):
        c = ndimage.uniform_filter((cls == v).astype(np.float32), size=3)
        m = c > best; best[m] = c[m]; out[m] = v
    lut = np.zeros((256, 3), np.uint8)
    for k, c in COLORS.items(): lut[k] = c
    return lut[out].astype(np.float32), rng


def downsample(level, lrng, z, area):
    """Média 2x2 alinhada com a grelha de tiles do nível z-1 (área `area`)."""
    X0, Y0, X1, Y1 = tile_range(z - 1, area)
    H = (Y1 - Y0 + 1) * 512; W = (X1 - X0 + 1) * 512
    canvas = np.full((H, W, 3), 243.0, np.float32)
    ox = (lrng[0] - X0 * 2) * 256; oy = (lrng[1] - Y0 * 2) * 256
    hh = min(level.shape[0], H - oy); ww = min(level.shape[1], W - ox)
    canvas[oy:oy + hh, ox:ox + ww] = level[:hh, :ww]
    return canvas.reshape(H // 2, 2, W // 2, 2, 3).mean(axis=(1, 3)), (X0, Y0, X1, Y1)


def build_cover():
    ds = rasterio.open(os.path.join(CACHE, 'ESA_WorldCover_10m_2021_v200_N36W009_Map.tif'))
    out = os.path.join(PUBLIC, 'tiles', 'cover')
    save = lambda a, p: Image.fromarray(a, 'RGB').save(p, 'WEBP', quality=82, method=6)
    total = 0
    # z14 e z13 só na AOI, a partir de um mosaico a z14
    level, lrng = colour_mosaic(ds, 14, AOI)
    for z in (14, 13):
        total += write_tiles(level.round().clip(0, 255).astype(np.uint8), lrng, z, out, 'webp', save=save)
        if z == 14:
            level, lrng = downsample(level, lrng, 14, AOI)
    # z12 a z8 na área alargada, a partir de um mosaico a z13
    level, lrng = colour_mosaic(ds, 13, WIDE)
    level, lrng = downsample(level, lrng, 13, WIDE)
    for z in range(12, 7, -1):
        total += write_tiles(level.round().clip(0, 255).astype(np.uint8), lrng, z, out, 'webp', save=save)
        if z > 8:
            level, lrng = downsample(level, lrng, z, WIDE)
    print('cover tiles', total)


if __name__ == '__main__':
    import sys
    what = sys.argv[1:] or ['dem', 'cover']
    if 'dem' in what: build_dem()
    if 'cover' in what: build_cover()
