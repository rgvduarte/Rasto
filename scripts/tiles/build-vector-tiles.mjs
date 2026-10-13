// Corta as camadas de .geo-cache/layers/*.geojson (geradas por scripts/geo/build_layers.py)
// em vector tiles MVT estáticas: public/tiles/v/{z}/{x}/{y}.pbf, z8 a z14.
// O mapa lê estas tiles diretamente do site: não há servidor de mapas nem chave de API.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import geojsonvt from 'geojson-vt'
import { fromGeojsonVt } from '@maplibre/vt-pbf'

const SRC = new URL('../../.geo-cache/layers/', import.meta.url)
const OUT = new URL('../../public/tiles/v/', import.meta.url)
const AOI = [-7.745, 37.7, -7.19, 38.22]
const WIDE = [-8.1, 37.5, -6.85, 38.42] // z8 a z12: vista geral sem recorte
const areaFor = (z) => (z <= 12 ? WIDE : AOI)
const ZMIN = 8
const ZMAX = 14

const read = (name) => JSON.parse(readFileSync(new URL(`${name}.geojson`, SRC), 'utf8'))

// Cada grupo vai para uma camada MVT a partir de um zoom mínimo.
// minzoom por grupo evita encher as tiles de baixo zoom com detalhe que não se vê.
const groups = []
function group(layer, minzoom, features) {
  if (!features.length) return
  groups.push({
    layer,
    minzoom,
    index: geojsonvt({ type: 'FeatureCollection', features }, { maxZoom: ZMAX, indexMaxZoom: 4, tolerance: 2.5, extent: 4096, buffer: 96 }),
  })
}
const by = (fc, pred) => fc.features.filter(pred)

const boundary = read('boundary')
group('boundary', 8, by(boundary, (f) => f.properties.kind !== 'freguesia'))
group('boundary', 10, by(boundary, (f) => f.properties.kind === 'freguesia'))

const protectedA = read('protected')
group('protected', 8, protectedA.features)

const water = read('water')
group('water', 8, by(water, (f) => (f.properties.area ?? 0) > 0.05 || f.properties.kind === 'river'))
group('water', 11, by(water, (f) => !((f.properties.area ?? 0) > 0.05 || f.properties.kind === 'river')))

const waterway = read('waterway')
group('waterway', 8, by(waterway, (f) => f.properties.kind === 'river'))
group('waterway', 10, by(waterway, (f) => f.properties.kind === 'stream' && f.properties.name))
group('waterway', 12, by(waterway, (f) => (f.properties.kind === 'stream' && !f.properties.name) || f.properties.kind === 'canal'))
group('waterway', 14, by(waterway, (f) => f.properties.kind === 'ditch'))

const contour = read('contour')
group('contour', 10, by(contour, (f) => f.properties.idx === 1))
group('contour', 12, by(contour, (f) => f.properties.idx !== 1))

const landuse = read('landuse')
group('landuse', 12, landuse.features)

const road = read('road')
const rk = (k) => (f) => f.properties.kind === k
group('road', 8, by(road, (f) => ['trunk', 'primary', 'secondary'].includes(f.properties.kind)))
group('road', 9, by(road, rk('tertiary')))
group('road', 11, by(road, (f) => ['minor', 'track'].includes(f.properties.kind)))
group('road', 13, by(road, (f) => ['service', 'path', 'pedestrian'].includes(f.properties.kind)))

group('rail', 10, read('rail').features)
group('building', 13, read('building').features)
group('place', 8, read('place').features)

function tileRange(z, A = areaFor(z)) {
  const n = 2 ** z
  const tx = (lon) => Math.floor(((lon + 180) / 360) * n)
  const ty = (lat) => {
    const r = (lat * Math.PI) / 180
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)
  }
  return [tx(A[0]), ty(A[3]), tx(A[2]), ty(A[1])]
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true })
let count = 0
let bytes = 0
for (let z = ZMIN; z <= ZMAX; z++) {
  const [x0, y0, x1, y1] = tileRange(z)
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const layers = {}
      for (const g of groups) {
        if (z < g.minzoom) continue
        const t = g.index.getTile(z, x, y)
        if (!t || !t.features.length) continue
        if (layers[g.layer]) layers[g.layer] = { ...layers[g.layer], features: layers[g.layer].features.concat(t.features) }
        else layers[g.layer] = t
      }
      if (!Object.keys(layers).length) continue
      const buf = fromGeojsonVt(layers, { version: 2, extent: 4096 })
      const dir = new URL(`${z}/${x}/`, OUT)
      mkdirSync(dir, { recursive: true })
      writeFileSync(new URL(`${y}.pbf`, dir), buf)
      count++
      bytes += buf.length
    }
  }
  console.log(`z${z} ok`)
}
console.log(`${count} tiles, ${(bytes / 1024 / 1024).toFixed(1)} MB`)
