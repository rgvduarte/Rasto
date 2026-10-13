// Trajetos de simulação e segmentos (public/data/sim-routes.json), calculados sobre a rede do OSM com altitude do Copernicus DEM.
import { siteBase } from '../map/style'

export type RoutePt = [number, number, number, number] // lon, lat, distância acumulada (m), altitude (m)
export type SimRoute = { id: string; name: string; mode: string; kmh: number; km: number; gain: number; stops: string[]; pts: RoutePt[] }
export type Segment = { id: string; name: string; route: string; km: number; gain: number; grade: number; maxGrade: number; pts: RoutePt[] }

let p: Promise<{ routes: SimRoute[]; segments: Segment[] }> | null = null
export function loadSim() {
  if (!p) p = fetch(`${siteBase()}data/sim-routes.json`).then((r) => r.json())
  return p
}

// posição a uma dada distância ao longo de um trajeto
export function along(pts: RoutePt[], d: number): { lon: number; lat: number; ele: number; heading: number; end: boolean } {
  if (d <= 0) return { lon: pts[0][0], lat: pts[0][1], ele: pts[0][3], heading: bearing(pts[0], pts[1]), end: false }
  const last = pts[pts.length - 1]
  if (d >= last[2]) return { lon: last[0], lat: last[1], ele: last[3], heading: bearing(pts[pts.length - 2], last), end: true }
  let lo = 0
  let hi = pts.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid][2] < d) lo = mid
    else hi = mid
  }
  const a = pts[lo]
  const b = pts[hi]
  const f = (d - a[2]) / (b[2] - a[2] || 1)
  return { lon: a[0] + (b[0] - a[0]) * f, lat: a[1] + (b[1] - a[1]) * f, ele: a[3] + (b[3] - a[3]) * f, heading: bearing(a, b), end: false }
}

export function bearing(a: number[], b: number[]) {
  const toR = Math.PI / 180
  const y = Math.sin((b[0] - a[0]) * toR) * Math.cos(b[1] * toR)
  const x = Math.cos(a[1] * toR) * Math.sin(b[1] * toR) - Math.sin(a[1] * toR) * Math.cos(b[1] * toR) * Math.cos((b[0] - a[0]) * toR)
  return ((Math.atan2(y, x) / toR) + 360) % 360
}
