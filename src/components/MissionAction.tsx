import { useState } from 'react'
import type { Mission } from '../data/missions'
import type { Poi } from '../data/types'
import { store, useGame } from '../lib/store'
import { km, fmtDist } from '../lib/geo'

// Validar uma missão:
//  gps    - pede a posição ao telemóvel e compara com o ponto (raio + margem da precisão, até 50 m)
//  codigo - código dado pelo parceiro. Nenhum parceiro aderiu ainda: sem modo de demonstração não há código válido.
//  demo   - para apresentar o protótipo fora de Serpa; fica marcado como demonstração.
const DEMO_CODE = 'SERPA'

export function MissionAction({ mission, poi }: { mission: Mission; poi: Poi }) {
  const game = useGame()
  const done = game.done[mission.id]
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null)
  const [codeIn, setCodeIn] = useState('')

  if (done) {
    const when = new Date(done.at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    return (
      <div className="mission is-done">
        <h3>{mission.title}</h3>
        <p className="msg">
          Feita a {when}
          {done.how === 'demo' ? ' (demonstração)' : ''}. +{mission.xp} XP
        </p>
        <button className="btn ghost small" style={{ marginTop: 10 }} onClick={() => store.undo(mission.id)}>
          Anular
        </button>
      </div>
    )
  }

  const checkGps = () => {
    if (game.demo) {
      store.complete(mission.id, 'demo')
      return
    }
    if (!('geolocation' in navigator)) {
      setMsg({ t: 'Este browser não dá a localização.', err: true })
      return
    }
    setBusy(true)
    setMsg({ t: 'A pedir a localização…' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        const d = km({ lat: pos.coords.latitude, lon: pos.coords.longitude }, poi) * 1000
        const slack = Math.min(50, pos.coords.accuracy || 50)
        if (d <= (mission.radius ?? 80) + slack) {
          store.complete(mission.id, 'gps')
          setMsg(null)
        } else {
          setMsg({ t: `Estás a ${fmtDist(d / 1000)} do ponto. A missão conta a menos de ${mission.radius ?? 80} m.`, err: true })
        }
      },
      (err) => {
        setBusy(false)
        setMsg({
          t: err.code === err.PERMISSION_DENIED ? 'Sem autorização para usar a localização.' : 'Não foi possível obter a localização. Tenta ao ar livre.',
          err: true,
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 20000 },
    )
  }

  const checkCode = (e: React.FormEvent) => {
    e.preventDefault()
    const c = codeIn.trim().toUpperCase()
    if (!c) return
    if (game.demo && c === DEMO_CODE) {
      store.complete(mission.id, 'demo')
      return
    }
    setMsg({
      t: game.demo
        ? `Código errado. Na demonstração o código é ${DEMO_CODE}.`
        : 'Este parceiro ainda não tem código ativo. Os códigos chegam quando o parceiro aderir ao Rasto.',
      err: true,
    })
  }

  return (
    <div className="mission">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{mission.title}</h3>
        <span className="tag xp">+{mission.xp} XP</span>
      </div>
      <p style={{ marginTop: 6 }}>{mission.brief}</p>
      {mission.check === 'gps' ? (
        <>
          <button className="btn anil small" style={{ marginTop: 12 }} onClick={checkGps} disabled={busy}>
            {game.demo ? 'Marcar como visitado (demonstração)' : 'Estou aqui'}
          </button>
          <p className="how">Confirma-se com a localização do telemóvel, a menos de {mission.radius ?? 80} m.</p>
        </>
      ) : (
        <>
          <form className="codebox" onSubmit={checkCode}>
            <label className="vh" htmlFor={`code-${mission.id}`}>
              Código do parceiro
            </label>
            <input
              id={`code-${mission.id}`}
              value={codeIn}
              onChange={(e) => setCodeIn(e.target.value)}
              placeholder="Código"
              autoComplete="off"
              maxLength={12}
            />
            <button className="btn anil small" type="submit">
              Validar
            </button>
          </form>
          <p className="how">O código é dado pelo parceiro, ao balcão ou no talão.{game.demo ? ` Demonstração: ${DEMO_CODE}.` : ''}</p>
        </>
      )}
      {msg && <p className={`msg${msg.err ? ' err' : ''}`}>{msg.t}</p>}
    </div>
  )
}
