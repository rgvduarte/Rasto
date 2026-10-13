// Momentos de captura: o ecrã de celebração lê daqui (missão cumprida, circuito fechado, subida de nível).
import { useSyncExternalStore } from 'react'
import { store, xpOf, levelOf, collectionProgress } from './store'

export type Cele =
  | { kind: 'mission'; missionId: string; levelBefore: number; sealsBefore: string[] }
  | { kind: 'loop'; cells: number }
  | null

let c: Cele = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export const celebrate = {
  get: () => c,
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  show(v: Cele) {
    c = v
    emit()
  },
  close() {
    c = null
    emit()
  },
}

export function useCelebrate() {
  return useSyncExternalStore(celebrate.subscribe, celebrate.get, celebrate.get)
}

// tira a fotografia do estado antes de cumprir, para o ecrã saber se subiu de nível ou ganhou um selo
export function snapshot() {
  const s = store.get()
  return {
    levelBefore: levelOf(xpOf(s).total).level,
    sealsBefore: collectionProgress(s).filter((x) => x.complete).map((x) => x.id),
  }
}

// câmara de realidade aumentada aberta sobre um lugar
let ar: string | null = null
const asubs = new Set<() => void>()
export const arView = {
  open(poi: string) {
    ar = poi
    asubs.forEach((f) => f())
  },
  close() {
    ar = null
    asubs.forEach((f) => f())
  },
}
export function useArView() {
  return useSyncExternalStore(
    (f) => {
      asubs.add(f)
      return () => asubs.delete(f)
    },
    () => ar,
  )
}
