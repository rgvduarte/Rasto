// Cumprir uma missão: confirma a posição (ou o código) e mostra a celebração.
import { store, type DoneHow } from './store'
import { recorder } from './recorder'
import { celebrate, snapshot } from './celebrate'
import { haptic } from './ui'
import { km, fmtDist } from './geo'
import type { Mission } from '../data/missions'
import type { Poi } from '../data/types'

export function captureMission(missionId: string, how: DoneHow) {
  const snap = snapshot()
  const r = recorder.get()
  const ok = r.status === 'recording' || r.status === 'paused' ? recorder.capture(missionId, how) : store.complete(missionId, how)
  if (ok) {
    haptic([20, 60, 20, 60, 80])
    celebrate.show({ kind: 'mission', missionId, ...snap })
  }
  return ok
}

type Here = { ok: true } | { ok: false; msg: string }

// "Estou aqui": usa a posição que o gravador já tem (se for recente e precisa) ou pede uma nova ao telemóvel
export function checkHere(m: Mission, p: Poi): Promise<Here> {
  const radius = m.radius ?? 80
  const judge = (lat: number, lon: number, acc: number): Here => {
    const d = km({ lat, lon }, p) * 1000
    if (d <= radius + Math.min(50, acc || 50)) return { ok: true }
    return { ok: false, msg: `Estás a ${fmtDist(d / 1000)} do ponto. A missão conta a menos de ${radius} m.` }
  }
  const r = recorder.get()
  if (r.pos && r.posAt && Date.now() - r.posAt < 15000 && r.pos.acc <= 60 && !r.sim) return Promise.resolve(judge(r.pos.lat, r.pos.lon, r.pos.acc))
  if (!('geolocation' in navigator)) return Promise.resolve({ ok: false, msg: 'Este browser não dá a localização.' })
  return new Promise((res) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => res(judge(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)),
      (err) =>
        res({
          ok: false,
          msg: err.code === err.PERMISSION_DENIED ? 'Sem autorização para usar a localização. Ativa-a nas definições do browser.' : 'Não foi possível obter a localização. Tenta ao ar livre.',
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
  })
}
