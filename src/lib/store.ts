// Estado do jogador, guardado no browser (localStorage). Sem servidor nesta fase:
// a camada está isolada aqui para ser trocada por uma API (contas, equipas, rankings reais).
import { useSyncExternalStore } from 'react'
import { MISSIONS, COLLECTIONS, missionById } from '../data/missions'
import { POIS } from '../data/catalog'

export type DoneHow = 'gps' | 'codigo' | 'demo'
export type State = {
  v: 1
  name: string
  crew: string
  demo: boolean
  done: Record<string, { at: number; how: DoneHow }>
}

const KEY = 'rasto.serpa.v1'
const EMPTY: State = { v: 1, name: '', crew: '', demo: false, done: {} }

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s && s.v === 1) return { ...EMPTY, ...s }
  } catch {
    /* sem armazenamento: joga-se na mesma, só não fica guardado */
  }
  return EMPTY
}

let state: State = load()
const subs = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* modo privado: ignora */
  }
  subs.forEach((f) => f())
}

export const store = {
  get: () => state,
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  complete(missionId: string, how: DoneHow) {
    if (state.done[missionId]) return
    set({ ...state, done: { ...state.done, [missionId]: { at: Date.now(), how } } })
  },
  undo(missionId: string) {
    const done = { ...state.done }
    delete done[missionId]
    set({ ...state, done })
  },
  setProfile(name: string, crew: string) {
    set({ ...state, name: name.trim().slice(0, 40), crew: crew.trim().slice(0, 40) })
  },
  setDemo(demo: boolean) {
    set({ ...state, demo })
  },
  reset() {
    set({ ...EMPTY })
  },
}

export function useGame() {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

// ---------- derivados ----------
export function collectionProgress(s: State) {
  return COLLECTIONS.map((c) => {
    const ms = MISSIONS.filter((m) => m.collection === c.id)
    const n = ms.filter((m) => s.done[m.id]).length
    return { ...c, total: ms.length, done: n, complete: n >= c.goal }
  })
}

export function xpOf(s: State) {
  const base = Object.keys(s.done).reduce((sum, id) => sum + (missionById(id)?.xp ?? 0), 0)
  const bonus = collectionProgress(s).reduce((sum, c) => sum + (c.complete ? c.bonus : 0), 0)
  return { base, bonus, total: base + bonus }
}

// freguesia explorada: 3 missões cumpridas dentro dela (ou todas, se tiver menos de 3)
export function freguesiaProgress(s: State) {
  const byF = new Map<string, { total: number; done: number }>()
  for (const m of MISSIONS) {
    const f = POIS.find((p) => p.id === m.poi)?.freguesia
    if (!f) continue
    const e = byF.get(f) ?? { total: 0, done: 0 }
    e.total++
    if (s.done[m.id]) e.done++
    byF.set(f, e)
  }
  return [...byF.entries()].map(([name, e]) => {
    const need = Math.min(3, e.total)
    return { name, ...e, need, p: Math.min(1, e.done / need), explored: e.done >= need }
  })
}

// níveis: cada nível pede mais 300 XP do que o anterior
export function levelOf(xp: number) {
  let lvl = 1
  let need = 300
  let floor = 0
  while (xp >= floor + need) {
    floor += need
    lvl++
    need += 300
  }
  return { level: lvl, into: xp - floor, need }
}
