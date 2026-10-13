// Gravador de atividades: o coração do jogo.
// Fonte: GPS do telemóvel (watchPosition) ou, no modo de demonstração, um trajeto real do OSM percorrido a velocidade acelerada.
// Em cada posição: distância, desnível (Copernicus DEM), hexágonos conquistados, lugares com missão ao alcance.
import { useSyncExternalStore } from 'react'
import { loadHexGrid, cellsAlong, cellsInside, type HexGrid } from './hex'
import { km } from './geo'
import { elevationAt, gainOf } from './dem'
import { store, type Activity, type ActivityType } from './store'
import { loadSim, along, bearing, type SimRoute, type Segment } from './sim'
import { MISSIONS } from '../data/missions'
import { poiById } from '../data/catalog'
import { celebrate } from './celebrate'

export type Pt = { lon: number; lat: number; t: number; d: number; ele: number | null }

export type RecState = {
  status: 'idle' | 'locating' | 'recording' | 'paused' | 'finished'
  type: ActivityType
  sim: { route: SimRoute; factor: number; d: number } | null
  pos: { lon: number; lat: number; acc: number; heading: number | null; speed: number | null } | null
  posAt: number | null
  pts: Pt[]
  distance: number
  gain: number
  elapsed: number
  newCells: number
  loops: number // circuitos fechados (o interior também fica conquistado)
  inRange: string[]
  captured: string[]
  error: string | null
  draft: Activity | null
}

const IDLE: RecState = {
  status: 'idle', type: 'caminhada', sim: null, pos: null, posAt: null, pts: [], distance: 0, gain: 0, elapsed: 0, newCells: 0,
  loops: 0, inRange: [], captured: [], error: null, draft: null,
}

let s: RecState = IDLE
const subs = new Set<() => void>()
const emit = (patch: Partial<RecState>) => {
  s = { ...s, ...patch }
  subs.forEach((f) => f())
}

let grid: HexGrid | null = null
let watchId: number | null = null
let simTimer: number | null = null
let clockTimer: number | null = null
let lastTick = 0
let wake: WakeLockSentinel | null = null
let watchOnly = false // a seguir a posição sem gravar (antes de começar)
let loopFrom = 0 // primeiro ponto do circuito ainda em aberto

// Fechar um circuito: voltar a menos de 35 m de um ponto por onde já passaste, com pelo menos 300 m de percurso pelo meio.
// As células cujo centro fica dentro do anel passam a ser tuas. Um vaivém pela mesma rua não fecha nada (não tem interior).
function closeLoop(pts: Pt[]) {
  if (!grid || pts.length < 10) return 0
  const i = pts.length - 1
  const p = pts[i]
  for (let j = loopFrom; j < i; j++) {
    if (p.d - pts[j].d < 300) break
    if (km(p, pts[j]) * 1000 > 35) continue
    const ring = pts.slice(j, i + 1).map((q) => [q.lon, q.lat] as [number, number])
    ring.push(ring[0])
    const inside = cellsInside(grid, ring)
    if (!inside.length) return 0
    loopFrom = i
    return store.addCells(inside.filter((c) => !store.hasCell(c)))
  }
  return 0
}

async function lockScreen() {
  try {
    wake = await (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLockSentinel> } }).wakeLock?.request('screen') ?? null
  } catch {
    wake = null
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (s.status === 'recording') && !wake) lockScreen()
})

function haptic(p: number | number[]) {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* sem vibração */
  }
}

function missionsInRange(lon: number, lat: number, acc: number) {
  const g = store.get()
  const out: string[] = []
  for (const m of MISSIONS) {
    if (g.done[m.id]) continue
    const p = poiById(m.poi)
    if (!p) continue
    const d = km({ lat, lon }, p) * 1000
    if (d <= (m.radius ?? 80) + Math.min(30, acc)) out.push(m.id)
  }
  return out
}

function onPosition(lon: number, lat: number, acc: number, heading: number | null, speed: number | null, ele: number | null) {
  const prev = s.pts[s.pts.length - 1]
  const pos = { lon, lat, acc, heading, speed }
  const posAt = Date.now()
  const inRange = missionsInRange(lon, lat, acc)
  if (inRange.some((id) => !s.inRange.includes(id))) haptic([30, 40, 30])
  if (s.status !== 'recording') {
    emit({ pos, posAt, inRange })
    return
  }
  const step = prev ? km(prev, { lat, lon }) * 1000 : 0
  // ruído do GPS: ignora saltos parados e leituras muito imprecisas
  if (!s.sim && (acc > 40 || (prev && step < 4))) {
    emit({ pos, posAt, inRange })
    return
  }
  const pt: Pt = { lon, lat, t: s.elapsed, d: s.distance + step, ele }
  const pts = [...s.pts, pt]
  let fresh = 0
  if (grid && prev) {
    const ids = cellsAlong(grid, [prev.lon, prev.lat], [lon, lat]).filter((i) => !store.hasCell(i))
    fresh = store.addCells(ids)
    if (fresh) haptic(12)
  } else if (grid && !prev) {
    fresh = store.addCells(cellsAlong(grid, [lon, lat], [lon, lat]))
  }
  const inLoop = closeLoop(pts)
  if (inLoop) {
    haptic([40, 50, 40, 50, 120])
    celebrate.show({ kind: 'loop', cells: inLoop })
  }
  emit({
    pos: { ...pos, heading: heading ?? (prev ? bearing([prev.lon, prev.lat], [lon, lat]) : null) },
    posAt,
    pts,
    distance: pt.d,
    newCells: s.newCells + fresh + inLoop,
    loops: s.loops + (inLoop ? 1 : 0),
    inRange,
  })
  if (ele === null) {
    // altitude do relevo do site, em segundo plano
    elevationAt(lon, lat).then((e) => {
      const i = s.pts.indexOf(pt)
      if (i < 0 || e === null) return
      const copy = [...s.pts]
      copy[i] = { ...pt, ele: e }
      emit({ pts: copy, gain: gainOf(copy.map((p) => p.ele).filter((v): v is number => v !== null)) })
    })
  } else {
    emit({ gain: gainOf(pts.map((p) => p.ele).filter((v): v is number => v !== null)) })
  }
}

function startClock() {
  stopClock()
  lastTick = performance.now()
  clockTimer = window.setInterval(() => {
    const now = performance.now()
    const dt = now - lastTick
    lastTick = now
    if (s.status === 'recording') emit({ elapsed: s.elapsed + dt * (s.sim?.factor ?? 1) })
  }, 250)
}
function stopClock() {
  if (clockTimer !== null) clearInterval(clockTimer)
  clockTimer = null
}

function startGps() {
  if (!('geolocation' in navigator)) {
    emit({ error: 'Este browser não dá a localização.' })
    return
  }
  if (watchId !== null) return
  watchId = navigator.geolocation.watchPosition(
    (p) => onPosition(p.coords.longitude, p.coords.latitude, p.coords.accuracy, p.coords.heading, p.coords.speed, null),
    (e) =>
      emit({
        error: e.code === e.PERMISSION_DENIED ? 'Sem autorização para usar a localização. Ativa-a nas definições do browser.' : 'Sem sinal de GPS. Tenta ao ar livre.',
        status: s.status === 'locating' ? 'idle' : s.status,
      }),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 },
  )
}
function stopGps() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
}

function startSim() {
  stopSimTimer()
  let last = performance.now()
  simTimer = window.setInterval(() => {
    if (!s.sim || s.status !== 'recording') {
      last = performance.now()
      return
    }
    const now = performance.now()
    const dt = (now - last) / 1000
    last = now
    const d = s.sim.d + (s.sim.route.kmh / 3.6) * dt * s.sim.factor
    const p = along(s.sim.route.pts, d)
    s = { ...s, sim: { ...s.sim, d } }
    onPosition(p.lon, p.lat, 5, p.heading, s.sim!.route.kmh / 3.6, p.ele)
    // fim do percurso de simulação: pausa, como quem chega e para o relógio
    if (p.end) emit({ status: 'paused' })
  }, 200)
}
function stopSimTimer() {
  if (simTimer !== null) clearInterval(simTimer)
  simTimer = null
}

// ---------- API ----------
export const recorder = {
  get: () => s,
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
  // seguir a posição sem gravar (ecrã Gravar antes de começar, Explorar com "onde estou")
  watch() {
    watchOnly = true
    loadHexGrid().then((g) => (grid = g))
    if (!s.sim) startGps()
  },
  unwatch() {
    watchOnly = false
    if (s.status === 'idle' || s.status === 'finished') stopGps()
  },
  async start(type: ActivityType, simRouteId?: string, factor = 8) {
    grid = await loadHexGrid()
    loopFrom = 0
    if (simRouteId) {
      const { routes } = await loadSim()
      const route = routes.find((r) => r.id === simRouteId)!
      stopGps()
      const p0 = route.pts[0]
      s = { ...IDLE, type, status: 'recording', sim: { route, factor, d: 0 }, pos: { lon: p0[0], lat: p0[1], acc: 5, heading: null, speed: 0 }, posAt: Date.now() }
      emit({})
      onPosition(p0[0], p0[1], 5, null, 0, p0[3])
      startSim()
    } else {
      s = { ...IDLE, type, status: 'recording', pos: s.pos, posAt: s.posAt }
      emit({})
      startGps()
      if (s.pos) onPosition(s.pos.lon, s.pos.lat, s.pos.acc, s.pos.heading, s.pos.speed, null)
    }
    startClock()
    lockScreen()
    haptic(40)
  },
  pause() {
    if (s.status === 'recording') emit({ status: 'paused' })
  },
  resume() {
    if (s.status === 'paused') {
      lastTick = performance.now()
      emit({ status: 'recording' })
    }
  },
  capture(missionId: string, how: 'gps' | 'demo' | 'codigo') {
    if (store.complete(missionId, how)) {
      haptic([20, 60, 20, 60, 80])
      emit({ captured: [...s.captured, missionId], inRange: s.inRange.filter((x) => x !== missionId) })
      return true
    }
    return false
  },
  async stop() {
    stopClock()
    stopSimTimer()
    if (!watchOnly) stopGps()
    wake?.release().catch(() => {})
    wake = null
    const draft = await summarize(s)
    emit({ status: 'finished', draft })
  },
  save(name?: string) {
    const id = s.draft?.id ?? null
    if (s.draft) store.saveActivity({ ...s.draft, name: name?.trim() || s.draft.name })
    s = { ...IDLE, pos: s.sim ? null : s.pos, posAt: s.sim ? null : s.posAt }
    emit({})
    if (watchOnly) startGps()
    return id
  },
  discard() {
    s = { ...IDLE, pos: s.sim ? null : s.pos, posAt: s.sim ? null : s.posAt }
    emit({})
    if (watchOnly) startGps()
  },
}

export function useRecorder() {
  return useSyncExternalStore(recorder.subscribe, recorder.get, recorder.get)
}

// ---------- resumo ----------
const TYPE_NAME: Record<ActivityType, string> = { caminhada: 'Caminhada', corrida: 'Corrida', bicicleta: 'Volta de bicicleta' }


async function summarize(r: RecState): Promise<Activity> {
  const pts = r.pts
  const { segments } = await loadSim()
  // pontos espaçados de pelo menos 10 m, no máximo ~800
  const track: [number, number, number][] = []
  let last: Pt | null = null
  for (const p of pts) {
    if (!last || p.d - last.d >= 10 || p === pts[pts.length - 1]) {
      track.push([+p.lon.toFixed(6), +p.lat.toFixed(6), Math.round(p.t / 1000)])
      last = p
    }
  }
  const stride = Math.max(1, Math.ceil(track.length / 800))
  const tr = track.filter((_, i) => i % stride === 0 || i === track.length - 1)
  const withEle = pts.filter((p) => p.ele !== null)
  const pstride = Math.max(1, Math.ceil(withEle.length / 120))
  const profile = withEle.filter((_, i) => i % pstride === 0 || i === withEle.length - 1).map((p) => [Math.round(p.d), Math.round(p.ele! * 10) / 10] as [number, number])
  const mid = pts[Math.floor(pts.length / 2)] ?? pts[0]
  const place = mid ? nearestPlace(mid.lon, mid.lat) : { name: 'Serpa', prep: 'em Serpa' }
  return {
    id: `a${Date.now().toString(36)}`,
    type: r.type,
    name: `${TYPE_NAME[r.type]} ${place.prep}`,
    startedAt: Date.now() - Math.round(r.elapsed),
    durationS: Math.round(r.elapsed / 1000),
    distanceM: Math.round(r.distance),
    gainM: Math.round(r.gain),
    cells: r.newCells,
    loops: r.loops,
    missions: r.captured,
    track: tr,
    profile,
    efforts: efforts(pts, segments),
    simulated: !!r.sim,
  }
}

function efforts(pts: Pt[], segments: Segment[]) {
  const out: { segment: string; timeS: number }[] = []
  for (const sg of segments) {
    const a = sg.pts[0]
    const b = sg.pts[sg.pts.length - 1]
    const near = (p: Pt, q: number[], m: number) => km(p, { lon: q[0], lat: q[1] }) * 1000 <= m
    const i = pts.findIndex((p) => near(p, a, 35))
    if (i < 0) continue
    let j = -1
    for (let k = i + 1; k < pts.length; k++) if (near(pts[k], b, 35)) { j = k; break }
    if (j < 0) continue
    // o troço tem de ter sido feito pelo caminho do segmento (amostra de 12 pontos)
    const sample = sg.pts.filter((_, k) => k % Math.max(1, Math.floor(sg.pts.length / 12)) === 0)
    const ok = sample.every((q) => pts.slice(i, j + 1).some((p) => near(p, q, 45)))
    if (ok) out.push({ segment: sg.id, timeS: Math.max(1, Math.round((pts[j].t - pts[i].t) / 1000)) })
  }
  return out
}

let places: { name: string; lat: number; lon: number; rank: number; inSerpa: boolean }[] = []
export function setPlaces(p: typeof places) {
  places = p.filter((x) => x.inSerpa && x.rank <= 4)
}
function nearestPlace(lon: number, lat: number) {
  if (!places.length) return { name: 'Serpa', prep: 'em Serpa' }
  let best = places[0]
  let bd = Infinity
  for (const p of places) {
    const d = km({ lon, lat }, p)
    if (d < bd) {
      bd = d
      best = p
    }
  }
  return { name: best.name, prep: bd < 2.5 ? `em ${best.name}` : `perto de ${best.name}` }
}
