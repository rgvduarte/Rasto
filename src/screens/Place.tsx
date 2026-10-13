// Ficha de um lugar: o que é, como chegar, a classificação do TripAdvisor, a missão, a realidade aumentada e a tua avaliação.
import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Glyph, Stars } from '../ui/bits'
import { POIS, SUB_LABEL } from '../data/catalog'
import { missionByPoi, COLLECTIONS, MISSIONS, type Mission } from '../data/missions'
import { arByPoi } from '../data/ar'
import type { Poi } from '../data/types'
import { store, useGame, missionXp } from '../lib/store'
import { km, fmtDist, fmt1, fmtInt, directionsUrl, osmUrl, walkMin, driveMin, fmtMin } from '../lib/geo'
import { captureMission, checkHere } from '../lib/capture'
import { arView } from '../lib/celebrate'
import { share } from '../lib/ui'
import { requestCompass } from './ArView'

const DEMO_CODE = 'SERPA'

export function PlaceHead({ poi, origin, onClose }: { poi: Poi; origin: { lat: number; lon: number }; onClose: () => void }) {
  const d = km(origin, poi)
  return (
    <div className="place-head">
      <div className="place-top">
        <div className="grow">
          <h2>{poi.name}</h2>
          <p className="place-kind">
            {SUB_LABEL[poi.sub]}, {poi.placeKm < 1 ? poi.place : `perto de ${poi.place}`}
            <span className="sep" aria-hidden="true" />
            <span className="num">{fmtDist(d)}</span>
          </p>
          {poi.ta?.rating ? (
            <p className="place-ta">
              <b className="num">{fmt1(poi.ta.rating)}</b>
              <Stars value={poi.ta.rating} />
              <span className="muted num">
                {poi.ta.reviews ? `${fmtInt(poi.ta.reviews)} ${poi.ta.reviews === 1 ? 'opinião' : 'opiniões'}` : ''} no TripAdvisor
              </span>
            </p>
          ) : poi.ta ? (
            <p className="place-ta muted">No TripAdvisor, ainda sem classificação</p>
          ) : null}
        </div>
        <button className="iconbtn soft" onClick={onClose} aria-label="Fechar a ficha">
          <Icon name="fechar" />
        </button>
      </div>
    </div>
  )
}

export function PlaceBody({ poi, origin, hasUser, onPick }: { poi: Poi; origin: { lat: number; lon: number }; hasUser: boolean; onPick: (id: string) => void }) {
  const game = useGame()
  const m = missionByPoi(poi.id)
  const ar = arByPoi(poi.id)
  const saved = game.saved.includes(poi.id)
  const d = km(origin, poi)
  const near = POIS.filter((p) => p.id !== poi.id)
    .map((p) => ({ p, d: km(poi, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4)
  const link = `${location.origin}${location.pathname}#/?p=${poi.id}`

  return (
    <div className="place">
      <div className="actions">
        <a className="act primary" href={directionsUrl(poi)} target="_blank" rel="noreferrer">
          <span className="c">
            <Icon name="direcoes" />
          </span>
          Direções
        </a>
        <button className="act" aria-pressed={saved} onClick={() => store.toggleSaved(poi.id)}>
          <span className="c">
            <Icon name="guardar" fill={saved ? 'currentColor' : undefined} />
          </span>
          {saved ? 'Guardado' : 'Guardar'}
        </button>
        <button className="act" onClick={() => share({ title: poi.name, text: `${poi.name}, no Rasto Serpa`, url: link })}>
          <span className="c">
            <Icon name="partilhar" />
          </span>
          Partilhar
        </button>
        {poi.ta?.url ? (
          <a className="act" href={poi.ta.url} target="_blank" rel="noreferrer">
            <span className="c">
              <Icon name="estrela" />
            </span>
            TripAdvisor
          </a>
        ) : poi.web ? (
          <a className="act" href={poi.web} target="_blank" rel="noreferrer">
            <span className="c">
              <Icon name="info" />
            </span>
            Site
          </a>
        ) : (
          <a className="act" href={osmUrl(poi)} target="_blank" rel="noreferrer">
            <span className="c">
              <Icon name="mapa" />
            </span>
            OSM
          </a>
        )}
      </div>

      {m && <MissionCard m={m} poi={poi} />}

      {ar && (
        <div className="ar-note">
          <div className="ar-note-top">
            <b>Realidade aumentada</b>
            <span className="pill">por integrar</span>
          </div>
          <p>
            <b className="ink">{ar.title}.</b> {ar.aim}
          </p>
          <p className="t-small">{ar.shows}</p>
          <button
            className="btn line sm"
            onClick={async () => {
              await requestCompass()
              arView.open(poi.id)
            }}
          >
            <Icon name="camara" size={20} /> Abrir a câmara
          </button>
          <p className="note">Conteúdo do roteiro de realidade aumentada da Câmara Municipal de Serpa. A câmara já aponta para o sítio certo; a animação entra quando for integrada.</p>
        </div>
      )}

      <p className="place-sum">{poi.summary}</p>

      <dl className="facts">
        <dt>{hasUser ? 'De ti' : 'Do centro de Serpa'}</dt>
        <dd>
          {fmtDist(d)} em linha reta, {d < 2 ? `cerca de ${fmtMin(walkMin(d))} a pé` : `cerca de ${fmtMin(driveMin(d))} de carro`}
        </dd>
        {poi.freguesia && (
          <>
            <dt>Freguesia</dt>
            <dd>{poi.freguesia}</dd>
          </>
        )}
        {poi.ta && (
          <>
            <dt>TripAdvisor</dt>
            <dd>
              {[
                poi.ta.rank && poi.ta.of ? `n.º ${poi.ta.rank} de ${poi.ta.of} ${poi.ta.list === 'restaurantes' ? 'restaurantes' : 'coisas para fazer'} em ${poi.ta.geo ?? 'Serpa'}` : null,
                poi.ta.closed ? 'marcado como fechado' : null,
              ]
                .filter(Boolean)
                .join(', ') || 'listado'}
              <span className="muted">. Recolha de 13 out 2026.</span>
            </dd>
          </>
        )}
        <dt>Posição</dt>
        <dd>
          <a href={osmUrl(poi)} target="_blank" rel="noreferrer">
            {poi.source.dataset === 'osm' ? 'OpenStreetMap' : 'Overture Maps'}
          </a>
          {poi.approx ? <span className="muted">, pela morada (aproximada)</span> : null}
        </dd>
      </dl>

      <MyRating poi={poi} />

      <div>
        <h3 className="section-t">Perto daqui</h3>
        <div className="rows flush">
          {near.map(({ p, d: dd }) => (
            <button key={p.id} className="row-btn" onClick={() => onPick(p.id)}>
              <Glyph sub={p.sub} fam={p.fam} done={!!(missionByPoi(p.id) && game.done[missionByPoi(p.id)!.id])} />
              <span>
                <span className="row-name">{p.name}</span>
                <span className="row-meta">{SUB_LABEL[p.sub]}</span>
              </span>
              <span className="row-right num">{fmtDist(dd)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MissionCard({ m, poi }: { m: Mission; poi: Poi }) {
  const game = useGame()
  const done = game.done[m.id]
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null)
  const [code, setCode] = useState('')
  const xp = missionXp(game, m.id)
  const coll = COLLECTIONS.find((c) => c.id === m.collection)!
  const inColl = MISSIONS.filter((x) => x.collection === coll.id)
  const doneInColl = inColl.filter((x) => game.done[x.id]).length

  if (done) {
    const when = new Date(done.at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
    return (
      <div className="mission is-done">
        <div className="mission-top">
          <h3>{m.title}</h3>
          <span className="xp got">+{xp} XP</span>
        </div>
        <p className="msg">
          <Icon name="check" size={18} stroke={2.6} style={{ verticalAlign: '-3px', color: 'var(--ver)' }} /> Cumprida a {when}
          {done.how === 'demo' ? ', em demonstração' : ''}.
        </p>
        <p className="how">
          {coll.name}: {Math.min(doneInColl, coll.goal)} de {coll.goal} para o selo {coll.seal}.
        </p>
      </div>
    )
  }

  const here = async () => {
    if (game.demo) {
      captureMission(m.id, 'demo')
      return
    }
    setBusy(true)
    setMsg({ t: 'A confirmar a tua posição…' })
    const r = await checkHere(m, poi)
    setBusy(false)
    if (r.ok) {
      setMsg(null)
      captureMission(m.id, 'gps')
    } else setMsg({ t: r.msg, err: true })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!c) return
    if (game.demo && c === DEMO_CODE) {
      captureMission(m.id, 'demo')
      return
    }
    setMsg({
      t: game.demo ? `Código errado. Na demonstração o código é ${DEMO_CODE}.` : 'Este parceiro ainda não tem código ativo. Os códigos chegam quando o parceiro aderir ao Rasto.',
      err: true,
    })
  }

  return (
    <div className="mission">
      <div className="mission-top">
        <h3>{m.title}</h3>
        <span className="xp">+{xp} XP</span>
      </div>
      <p className="msg">{m.brief}</p>
      {m.check === 'gps' ? (
        <>
          <button className="btn anil block" onClick={here} disabled={busy}>
            <Icon name="localizar" size={20} /> {game.demo ? 'Marcar como visitado (demonstração)' : 'Estou aqui'}
          </button>
          <p className="how">Conta com o GPS do telemóvel, a menos de {m.radius ?? 80} m do ponto.</p>
        </>
      ) : (
        <>
          <form className="codebox" onSubmit={submit}>
            <label className="vh" htmlFor={`code-${m.id}`}>
              Código do parceiro
            </label>
            <input id={`code-${m.id}`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código" autoComplete="off" maxLength={12} />
            <button className="btn anil sm" type="submit">
              Validar
            </button>
          </form>
          <p className="how">O código é dado pelo parceiro, ao balcão ou no talão.{game.demo ? ` Demonstração: ${DEMO_CODE}.` : ''}</p>
        </>
      )}
      {msg && <p className={`msg${msg.err ? ' err' : ''}`}>{msg.t}</p>}
      <p className="how">
        Coleção {coll.name}: {doneInColl} de {coll.goal}.
      </p>
    </div>
  )
}

function MyRating({ poi }: { poi: Poi }) {
  const game = useGame()
  const mine = game.ratings[poi.id]
  const [note, setNote] = useState(mine?.note ?? '')
  const stars = mine?.stars ?? 0
  return (
    <div className="myrate">
      <h3 className="section-t">A tua avaliação</h3>
      <div className="stars" role="group" aria-label="Estrelas">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} className={i <= stars ? 'on' : ''} aria-label={`${i} ${i === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={i <= stars} onClick={() => store.rate(poi.id, i === stars ? 0 : i, note)}>
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
      {stars > 0 && (
        <textarea
          className="note-in"
          rows={2}
          placeholder="Uma nota só para ti (opcional)"
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => store.rate(poi.id, stars, note)}
        />
      )}
      <p className="note">Fica neste telemóvel. As opiniões partilhadas chegam com as contas.</p>
    </div>
  )
}
