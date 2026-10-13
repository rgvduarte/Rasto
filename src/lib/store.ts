// Estado do jogador, guardado no telemóvel (localStorage). Sem servidor nesta fase:
// a camada está isolada aqui para ser trocada por uma API (contas, equipas, rankings, avaliações partilhadas).
import { useSyncExternalStore } from 'react'
import { MISSIONS, COLLECTIONS, missionById } from '../data/missions'
import { POIS } from '../data/catalog'
import { avatarById, type AvatarKind } from '../data/avatars'

export type DoneHow = 'gps' | 'codigo' | 'demo'
export type ActivityType = 'caminhada' | 'corrida' | 'bicicleta'

export type Activity = {
  id: string
  type: ActivityType
  name: string
  startedAt: number
  durationS: number
  distanceM: number
  gainM: number
  cells: number // hexágonos novos nesta atividade
  loops?: number // circuitos fechados
  missions: string[] // missões cumpridas durante a atividade
  track: [number, number, number][] // lon, lat, segundos desde o início (simplificado)
  profile: [number, number][] // distância (m), altitude (m)
  efforts: { segment: string; timeS: number }[]
  simulated: boolean
}

export type State = {
  v: 2
  name: string
  crew: string
  demo: boolean
  onboarded: boolean
  avatar: { kind: AvatarKind; ring: string } | null
  done: Record<string, { at: number; how: DoneHow }>
  cells: number[]
  activities: Activity[]
  ratings: Record<string, { stars: number; note?: string; at: number }>
  saved: string[]
  voice: boolean // anunciar cada quilómetro em voz alta durante a gravação
}

const KEY = 'rasto.serpa.v2'
const EMPTY: State = {
  v: 2, name: '', crew: '', demo: false, onboarded: false, avatar: null, done: {}, cells: [], activities: [], ratings: {}, saved: [], voice: false,
}

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s && s.v === 2) return { ...EMPTY, ...s }
    // migração da versão 1 (só missões e perfil)
    const old = JSON.parse(localStorage.getItem('rasto.serpa.v1') || 'null')
    if (old && old.v === 1) return { ...EMPTY, name: old.name || '', crew: old.crew || '', demo: !!old.demo, done: old.done || {} }
  } catch {
    /* sem armazenamento: joga-se na mesma, só não fica guardado */
  }
  return EMPTY
}

let state: State = load()
let cellSet = new Set(state.cells)
const subs = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* modo privado ou espaço cheio: o jogo continua nesta sessão */
  }
  subs.forEach((f) => f())
}

export const store = {
  get: () => state,
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  hasCell: (i: number) => cellSet.has(i),
  complete(missionId: string, how: DoneHow) {
    if (state.done[missionId]) return false
    set({ ...state, done: { ...state.done, [missionId]: { at: Date.now(), how } } })
    return true
  },
  undo(missionId: string) {
    const done = { ...state.done }
    delete done[missionId]
    set({ ...state, done })
  },
  addCells(ids: number[]) {
    const fresh = ids.filter((i) => !cellSet.has(i))
    if (!fresh.length) return 0
    for (const i of fresh) cellSet.add(i)
    set({ ...state, cells: [...state.cells, ...fresh] })
    return fresh.length
  },
  saveActivity(a: Activity) {
    set({ ...state, activities: [a, ...state.activities].slice(0, 40) })
  },
  deleteActivity(id: string) {
    set({ ...state, activities: state.activities.filter((a) => a.id !== id) })
  },
  setProfile(name: string, crew: string) {
    set({ ...state, name: name.trim().slice(0, 40), crew: crew.trim().slice(0, 40) })
  },
  setAvatar(kind: AvatarKind, ring: string) {
    set({ ...state, avatar: { kind, ring } })
  },
  finishOnboarding() {
    set({ ...state, onboarded: true })
  },
  setDemo(demo: boolean) {
    set({ ...state, demo })
  },
  setVoice(voice: boolean) {
    set({ ...state, voice })
  },
  rate(poi: string, stars: number, note?: string) {
    const ratings = { ...state.ratings }
    if (stars <= 0) delete ratings[poi]
    else ratings[poi] = { stars, note: note?.trim().slice(0, 280) || undefined, at: Date.now() }
    set({ ...state, ratings })
  },
  toggleSaved(poi: string) {
    const saved = state.saved.includes(poi) ? state.saved.filter((x) => x !== poi) : [poi, ...state.saved]
    set({ ...state, saved })
  },
  reset() {
    cellSet = new Set()
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

export const CELL_XP = 5

export function missionXp(s: State, missionId: string) {
  const m = missionById(missionId)
  if (!m) return 0
  const a = avatarById(s.avatar?.kind)
  return Math.round(m.xp * (a?.collection && a.collection === m.collection ? 1.25 : 1))
}

export function xpOf(s: State) {
  const base = Object.keys(s.done).reduce((sum, id) => sum + missionXp(s, id), 0)
  const bonus = collectionProgress(s).reduce((sum, c) => sum + (c.complete ? c.bonus : 0), 0)
  const cellXp = s.cells.length * CELL_XP * (s.avatar?.kind === 'andarilho' ? 2 : 1)
  return { base, bonus, cells: cellXp, total: base + bonus + cellXp }
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

// parciais por quilómetro a partir do percurso guardado (lon, lat, segundos)
export function splitsOf(track: [number, number, number][]) {
  const out: { km: number; timeS: number; partial?: number }[] = []
  let dist = 0
  let lastT = track[0]?.[2] ?? 0
  let next = 1000
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]
    const b = track[i]
    const d = haversine(a, b)
    while (d > 0 && dist + d >= next) {
      const f = (next - dist) / d
      const t = a[2] + (b[2] - a[2]) * f
      out.push({ km: out.length + 1, timeS: Math.max(1, Math.round(t - lastT)) })
      lastT = t
      next += 1000
    }
    dist += d
  }
  const rest = dist - (next - 1000)
  if (rest >= 100 && track.length) out.push({ km: out.length + 1, timeS: Math.max(1, Math.round(track[track.length - 1][2] - lastT)), partial: rest })
  return out
}

function haversine(a: number[], b: number[]) {
  const r = Math.PI / 180
  const dLat = (b[1] - a[1]) * r
  const dLon = (b[0] - a[0]) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h))
}

export function totals(s: State) {
  return s.activities.reduce(
    (t, a) => ({ km: t.km + a.distanceM / 1000, gain: t.gain + a.gainM, time: t.time + a.durationS, n: t.n + 1 }),
    { km: 0, gain: 0, time: 0, n: 0 },
  )
}
