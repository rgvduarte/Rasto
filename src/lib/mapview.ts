// O que o mapa único da app deve mostrar. Os ecrãs escrevem aqui; o MapStage lê e aplica.
import { useSyncExternalStore } from 'react'
import type { Poi } from '../data/types'

export type MapMode = 'explore' | 'record' | 'review' | 'quiet'

export type MapView = {
  mode: MapMode
  pois: Poi[]
  done: Set<string>
  selected: string | null
  cells: 'off' | 'conquered' | 'fog'
  track: [number, number][][] | null // uma ou mais linhas (percurso atual, ou todas as atividades)
  avatar: { lon: number; lat: number; heading: number | null } | null
  follow: boolean
  range: number
  inRange: string[]
  user: { lon: number; lat: number; acc: number } | null
  pad: { top: number; bottom: number; left: number; right: number }
  terrain: boolean
}

let v: MapView = {
  mode: 'explore', pois: [], done: new Set(), selected: null, cells: 'conquered', track: null, avatar: null, follow: false,
  range: 80, inRange: [], user: null, pad: { top: 0, bottom: 0, left: 0, right: 0 }, terrain: false,
}
const subs = new Set<() => void>()

type Cam = { kind: 'fit'; bounds: [[number, number], [number, number]]; maxZoom?: number } | { kind: 'fly'; lon: number; lat: number; zoom?: number; pitch?: number; bearing?: number } | { kind: 'serpa' }
const camSubs = new Set<(c: Cam) => void>()
let pending: Cam | null = null
const clickSubs = new Set<(id: string | null) => void>()

export const mapView = {
  get: () => v,
  set(patch: Partial<MapView>) {
    v = { ...v, ...patch }
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
  // um pedido feito antes de o mapa estar pronto fica guardado e é aplicado quando ele abrir
  camera(c: Cam) {
    if (!camSubs.size) pending = c
    else camSubs.forEach((f) => f(c))
  },
  onCamera(f: (c: Cam) => void) {
    camSubs.add(f)
    if (pending) {
      const c = pending
      pending = null
      f(c)
    }
    return () => {
      camSubs.delete(f)
    }
  },
  click(id: string | null) {
    clickSubs.forEach((f) => f(id))
  },
  onClick(f: (id: string | null) => void) {
    clickSubs.add(f)
    return () => {
      clickSubs.delete(f)
    }
  },
}

export function useMapView() {
  return useSyncExternalStore(mapView.subscribe, mapView.get, mapView.get)
}
