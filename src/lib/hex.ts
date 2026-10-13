// Grelha de território: hexágonos de 150 m de aresta dentro do concelho (gerada por scripts/geo/build_game.py).
// Mesma conta no browser e no script: plano local equirretangular centrado em `ref`, coordenadas axiais (q, r).
import { siteBase } from '../map/style'

export type HexGrid = {
  edge: number
  ref: [number, number]
  kx: number
  ky: number
  freguesias: string[]
  q: Int32Array
  r: Int32Array
  f: Int8Array
  index: Map<number, number> // chave (q, r) -> índice da célula
  count: number
  cx: Float32Array // centro de cada célula no plano local (m)
  cy: Float32Array
}

const SQ3 = Math.sqrt(3)
const keyOf = (q: number, r: number) => (q + 4096) * 8192 + (r + 4096)

let gridPromise: Promise<HexGrid> | null = null

export function loadHexGrid(): Promise<HexGrid> {
  if (!gridPromise) {
    gridPromise = fetch(`${siteBase()}data/hex.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`hex.json ${r.status}`)
        return r.json()
      })
      .then((d: { edge: number; ref: [number, number]; kx: number; ky: number; freguesias: string[]; cells: number[] }) => {
        const n = d.cells.length / 3
        const q = new Int32Array(n)
        const r = new Int32Array(n)
        const f = new Int8Array(n)
        const index = new Map<number, number>()
        const cx = new Float32Array(n)
        const cy = new Float32Array(n)
        for (let i = 0; i < n; i++) {
          q[i] = d.cells[i * 3]
          r[i] = d.cells[i * 3 + 1]
          f[i] = d.cells[i * 3 + 2]
          index.set(keyOf(q[i], r[i]), i)
          cx[i] = SQ3 * d.edge * (q[i] + r[i] / 2)
          cy[i] = 1.5 * d.edge * r[i]
        }
        return { edge: d.edge, ref: d.ref, kx: d.kx, ky: d.ky, freguesias: d.freguesias, q, r, f, index, count: n, cx, cy }
      })
  }
  return gridPromise
}

function toXY(g: HexGrid, lon: number, lat: number): [number, number] {
  return [(lon - g.ref[0]) * g.kx, (lat - g.ref[1]) * g.ky]
}
function toLL(g: HexGrid, x: number, y: number): [number, number] {
  return [g.ref[0] + x / g.kx, g.ref[1] + y / g.ky]
}

// célula (índice) onde está um ponto, ou -1 fora do concelho
export function cellAt(g: HexGrid, lon: number, lat: number): number {
  const [x, y] = toXY(g, lon, lat)
  const qf = ((SQ3 / 3) * x - y / 3) / g.edge
  const rf = ((2 / 3) * y) / g.edge
  // arredondamento cúbico
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return g.index.get(keyOf(q, r)) ?? -1
}

// células atravessadas entre dois pontos (amostragem a cada 40 m), para não saltar hexágonos a andar depressa
export function cellsAlong(g: HexGrid, a: [number, number], b: [number, number]): number[] {
  const [ax, ay] = toXY(g, a[0], a[1])
  const [bx, by] = toXY(g, b[0], b[1])
  const d = Math.hypot(bx - ax, by - ay)
  const n = Math.max(1, Math.ceil(d / 40))
  const out = new Set<number>()
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const [lon, lat] = toLL(g, ax + (bx - ax) * t, ay + (by - ay) * t)
    const c = cellAt(g, lon, lat)
    if (c >= 0) out.add(c)
  }
  return [...out]
}

// células cujo centro fica dentro de um circuito fechado (o anel do percurso), como no INTVL
export function cellsInside(g: HexGrid, ring: [number, number][]): number[] {
  if (ring.length < 4) return []
  const xs = new Float64Array(ring.length)
  const ys = new Float64Array(ring.length)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  ring.forEach(([lon, lat], k) => {
    const [x, y] = toXY(g, lon, lat)
    xs[k] = x
    ys[k] = y
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  })
  const out: number[] = []
  const n = ring.length
  for (let i = 0; i < g.count; i++) {
    const px = g.cx[i]
    const py = g.cy[i]
    if (px < x0 || px > x1 || py < y0 || py > y1) continue
    let inside = false
    for (let a = 0, b = n - 1; a < n; b = a++) {
      if (ys[a] > py !== ys[b] > py && px < ((xs[b] - xs[a]) * (py - ys[a])) / (ys[b] - ys[a]) + xs[a]) inside = !inside
    }
    if (inside) out.push(i)
  }
  return out
}

export function cellCenter(g: HexGrid, i: number): [number, number] {
  const x = SQ3 * g.edge * (g.q[i] + g.r[i] / 2)
  const y = 1.5 * g.edge * g.r[i]
  return toLL(g, x, y)
}

export function cellPolygon(g: HexGrid, i: number): [number, number][] {
  const cx = SQ3 * g.edge * (g.q[i] + g.r[i] / 2)
  const cy = 1.5 * g.edge * g.r[i]
  const ring: [number, number][] = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 30)
    const [lon, lat] = toLL(g, cx + g.edge * Math.cos(a), cy + g.edge * Math.sin(a))
    ring.push([+lon.toFixed(6), +lat.toFixed(6)])
  }
  ring.push(ring[0])
  return ring
}

let fcCache: GeoJSON.FeatureCollection | null = null
export function gridGeoJSON(g: HexGrid): GeoJSON.FeatureCollection {
  if (fcCache) return fcCache
  const features: GeoJSON.Feature[] = new Array(g.count)
  for (let i = 0; i < g.count; i++) {
    features[i] = { type: 'Feature', id: i, properties: {}, geometry: { type: 'Polygon', coordinates: [cellPolygon(g, i)] } }
  }
  fcCache = { type: 'FeatureCollection', features }
  return fcCache
}

export function freguesiaShare(g: HexGrid, captured: Iterable<number>) {
  const tot = new Array(g.freguesias.length).fill(0)
  const got = new Array(g.freguesias.length).fill(0)
  for (let i = 0; i < g.count; i++) if (g.f[i] >= 0) tot[g.f[i]]++
  for (const i of captured) if (g.f[i] >= 0) got[g.f[i]]++
  return g.freguesias.map((name, k) => ({ name, total: tot[k], got: got[k], p: tot[k] ? got[k] / tot[k] : 0 }))
}
