// Gravar: começar uma caminhada, corrida ou volta de bicicleta e conquistar o território à passagem (Strava + Pokémon GO + INTVL).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { BottomSheet, safeArea } from '../ui/BottomSheet'
import { Glyph, ElevationChart } from '../ui/bits'
import { useRecorder, recorder } from '../lib/recorder'
import { useGame, missionXp, type ActivityType, type Activity } from '../lib/store'
import { mapView } from '../lib/mapview'
import { loadSim, type SimRoute, type Segment } from '../lib/sim'
import { captureMission } from '../lib/capture'
import { POIS, poiById } from '../data/catalog'
import { MISSIONS, missionById, missionByPoi } from '../data/missions'
import { km, fmtDist, fmtInt } from '../lib/geo'
import { fmtClock, fmtPace, fmtKm, say, useViewportH } from '../lib/ui'
import { go } from '../lib/router'
import { SERPA_CENTER } from './Explore'

const TAB_H = 62
const TYPES: { id: ActivityType; label: string }[] = [
  { id: 'caminhada', label: 'Caminhada' },
  { id: 'corrida', label: 'Corrida' },
  { id: 'bicicleta', label: 'Bicicleta' },
]
const MISSION_POIS = POIS.filter((p) => missionByPoi(p.id))

export function Record({ narrow }: { narrow: boolean }) {
  const rec = useRecorder()
  const game = useGame()
  const [type, setType] = useState<ActivityType>(rec.type)
  const [sim, setSim] = useState<{ routes: SimRoute[]; segments: Segment[] } | null>(null)
  const [showSim, setShowSim] = useState(false)
  const fitted = useRef<string | null>(null)
  const sa = safeArea()

  useEffect(() => {
    recorder.watch()
    loadSim().then(setSim)
  }, [])

  const live = rec.status === 'recording' || rec.status === 'paused'
  const fin = rec.status === 'finished'
  const inSerpa = !!rec.pos && km(rec.pos, SERPA_CENTER) < 30

  const doneSet = useMemo(() => {
    const s = new Set<string>()
    for (const m of MISSIONS) if (game.done[m.id]) s.add(m.poi)
    return s
  }, [game.done])

  const track = useMemo(() => (rec.pts.length > 1 ? [rec.pts.map((p) => [p.lon, p.lat] as [number, number])] : null), [rec.pts])

  useEffect(() => {
    mapView.set({
      mode: fin ? 'review' : 'record',
      pois: MISSION_POIS,
      done: doneSet,
      selected: null,
      cells: 'fog',
      track,
      avatar: rec.pos && !fin ? { lon: rec.pos.lon, lat: rec.pos.lat, heading: rec.pos.heading } : null,
      user: rec.pos && !fin && !rec.sim ? { lon: rec.pos.lon, lat: rec.pos.lat, acc: rec.pos.acc } : null,
      follow: !fin && !!rec.pos && (live || inSerpa),
      range: (rec.type ?? type) === 'bicicleta' ? 120 : 80,
      inRange: rec.inRange,
      terrain: false,
    })
  }, [rec.pos, rec.inRange, track, fin, live, inSerpa, doneSet, rec.type, type, rec.sim])

  const vh = useViewportH()
  const avail = vh - TAB_H - sa.bottom
  const finSnaps = [236, Math.round(avail * 0.56), avail - sa.top - 12]
  const [finSnap, setFinSnap] = useState(1)

  useEffect(() => {
    const bottom = narrow ? TAB_H + sa.bottom + (fin ? Math.min(finSnaps[finSnap], finSnaps[1]) : live ? 150 : 250) : 0
    mapView.set({ pad: narrow ? { top: sa.top + (live ? 150 : 20), bottom, left: 0, right: 0 } : { top: 0, bottom: 0, left: 84 + 404, right: 0 } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, fin, live, finSnap])

  // no fim, enquadra o percurso todo
  useEffect(() => {
    if (!fin || !rec.draft || fitted.current === rec.draft.id) return
    fitted.current = rec.draft.id
    const b = boundsOf(rec.draft.track.map((p) => [p[0], p[1]]))
    if (b) setTimeout(() => mapView.camera({ kind: 'fit', bounds: b, maxZoom: 16 }), 60)
  }, [fin, rec.draft])

  // sem posição e sem gravar: mostra o concelho
  useEffect(() => {
    if (rec.status === 'idle' && !inSerpa) mapView.camera({ kind: 'serpa' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.status === 'idle', inSerpa])

  const start = (simId?: string) => {
    const r = simId ? sim?.routes.find((x) => x.id === simId) : undefined
    const t: ActivityType = r ? (r.mode.includes('bicicleta') ? 'bicicleta' : r.kmh >= 8 ? 'corrida' : 'caminhada') : type
    setType(t)
    recorder.start(t, simId, r ? (r.km > 5 ? 16 : 8) : 1)
  }

  // resumo: nome editável e as duas ações sempre à vista no topo da folha
  const [name, setName] = useState('')
  useEffect(() => {
    if (rec.draft) setName(rec.draft.name)
  }, [rec.draft])
  const save = () => {
    const id = recorder.save(name)
    say('Atividade guardada')
    go('/atividade', id ? { a: id } : undefined)
  }
  const discard = () => {
    if (confirm('Descartar esta atividade? Os hexágonos e as missões ficam, o percurso não.')) recorder.discard()
  }

  // ---------- antes de começar ----------
  if (rec.status === 'idle' || rec.status === 'locating') {
    const gps = rec.error
      ? { t: rec.error, cls: 'err' }
      : !rec.pos
        ? { t: 'A procurar o GPS…', cls: 'wait' }
        : !inSerpa
          ? { t: `GPS pronto, mas estás a ${fmtDist(km(rec.pos, SERPA_CENTER))} de Serpa. A gravação conta; o território só se conquista no concelho.`, cls: 'warn' }
          : { t: `GPS pronto, precisão de ${fmtInt(rec.pos.acc)} m`, cls: 'ok' }
    const card = (
      <div className="start-card">
        <p className={`gps ${gps.cls}`}>
          <i aria-hidden="true" />
          {gps.t}
        </p>
        <div className="types" role="group" aria-label="Tipo de atividade">
          {TYPES.map((t) => (
            <button key={t.id} aria-pressed={type === t.id} onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="bigbtn go" onClick={() => start()}>
          <Icon name="play" size={22} fill="currentColor" stroke={0} /> Começar
        </button>
        <button className="linkbtn" aria-expanded={showSim} onClick={() => setShowSim(!showSim)}>
          {showSim ? 'Esconder a simulação' : inSerpa ? 'Ou experimenta uma simulação' : 'Não estás em Serpa? Experimenta uma simulação'}
        </button>
        {showSim && sim && (
          <div className="sim-list">
            <p className="note">
              Um percurso real do OpenStreetMap, feito 8 a 16 vezes mais depressa. Conquista hexágonos e missões como se lá estivesses, e fica marcado como
              simulação.
            </p>
            {sim.routes.map((r) => (
              <button key={r.id} onClick={() => start(r.id)}>
                <span>
                  <b>{r.name}</b>
                  <span className="muted t-small">
                    {' '}
                    {r.km.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} km, {fmtInt(r.gain)} m a subir, {r.mode}
                  </span>
                </span>
                <Icon name="play" size={18} fill="currentColor" stroke={0} />
              </button>
            ))}
          </div>
        )}
      </div>
    )
    if (!narrow)
      return (
        <aside className="panel">
          <div className="panel-scroll page-pad">
            <header className="page-head">
              <h1>Gravar</h1>
            </header>
            <IdleIntro />
            {card}
          </div>
        </aside>
      )
    return <div className="rec-bottom">{card}</div>
  }

  // ---------- a gravar ----------
  if (live) {
    const bike = rec.type === 'bicicleta'
    const reach = rec.inRange.map((id) => missionById(id)).filter((m): m is NonNullable<typeof m> => !!m)
    const hud = (
      <div className="hud float">
        <div className="hud-time">
          <b className="t-big num">{fmtClock(rec.elapsed)}</b>
          {rec.status === 'paused' && <span className="pill">{rec.sim && rec.sim.d >= rec.sim.route.pts[rec.sim.route.pts.length - 1][2] ? 'Fim do percurso' : 'Em pausa'}</span>}
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <b className="t-big num">{fmtKm(rec.distance)}</b>
            <span>km</span>
          </div>
          <div className="hud-stat">
            <b className="t-big num">{fmtPace(rec.distance, rec.elapsed, bike)}</b>
            <span>{bike ? 'km/h' : 'min/km'}</span>
          </div>
          <div className="hud-stat">
            <b className="t-big num">{fmtInt(rec.gain)}</b>
            <span>m a subir</span>
          </div>
          <div className="hud-stat got">
            <b className="t-big num">{fmtInt(rec.newCells)}</b>
            <span>hexágonos</span>
          </div>
        </div>
        {(rec.sim || rec.loops > 0 || (rec.pos && !rec.sim)) && (
          <div className="hud-line">
            {rec.sim && <span className="pill sim">Simulação, {rec.sim.factor}×</span>}
            {rec.loops > 0 && (
              <span className="pill ocre">
                {rec.loops} {rec.loops === 1 ? 'circuito fechado' : 'circuitos fechados'}
              </span>
            )}
            {rec.pos && !rec.sim && <span className="pill">GPS ±{fmtInt(rec.pos.acc)} m</span>}
          </div>
        )}
      </div>
    )
    const bottom = (
      <div className={narrow ? 'rec-bottom' : 'rec-side'}>
        {reach.slice(0, 1).map((m) => {
          const p = poiById(m.poi)!
          return (
            <div className="reach float" key={m.id}>
              <Glyph sub={p.sub} fam={p.fam} size={44} />
              <span>
                <b>{m.title}</b>
                <span>
                  {p.name !== m.title ? `${p.name}, a ` : 'A '}
                  {fmtDist(km(rec.pos!, p))}
                </span>
              </span>
              {m.check === 'gps' ? (
                <button className="btn anil sm" onClick={() => captureMission(m.id, rec.sim ? 'demo' : 'gps')}>
                  +{missionXp(game, m.id)} XP
                </button>
              ) : (
                <a className="btn line sm" href={`#/?p=${p.id}`}>
                  Código
                </a>
              )}
            </div>
          )
        })}
        <div className="rec-ctl">
          {rec.status === 'recording' ? (
            <button className="bigbtn" onClick={() => recorder.pause()} aria-label="Pausa">
              <Icon name="pausa" size={30} stroke={3} />
            </button>
          ) : (
            <>
              <button className="bigbtn" onClick={() => recorder.resume()} aria-label="Retomar">
                <Icon name="play" size={30} fill="currentColor" stroke={0} />
              </button>
              <button className="bigbtn stop" onClick={() => recorder.stop()} aria-label="Terminar">
                <Icon name="parar" size={24} fill="currentColor" stroke={0} />
              </button>
            </>
          )}
        </div>
        {rec.status === 'paused' && <p className="rec-hint">Carrega no quadrado para terminar e ver o resumo.</p>}
      </div>
    )
    if (!narrow)
      return (
        <aside className="panel">
          <div className="panel-scroll page-pad">
            {hud}
            {bottom}
          </div>
        </aside>
      )
    return (
      <>
        {hud}
        {bottom}
      </>
    )
  }

  // ---------- resumo ----------
  if (fin && rec.draft) {
    const head = (
      <div className="sum-head">
        <button className="btn soft sm" onClick={discard}>
          Descartar
        </button>
        <b>Resumo</b>
        <button className="btn anil sm" onClick={save}>
          Guardar
        </button>
      </div>
    )
    const body = <Summary a={rec.draft} segments={sim?.segments ?? []} name={name} setName={setName} />
    if (!narrow)
      return (
        <aside className="panel">
          {head}
          <div className="panel-scroll">{body}</div>
        </aside>
      )
    return (
      <BottomSheet snaps={finSnaps} index={finSnap} onIndex={setFinSnap} label="Resumo da atividade" header={head}>
        {body}
      </BottomSheet>
    )
  }
  return null
}

function IdleIntro() {
  return (
    <div className="intro">
      <p>
        Cada hexágono de 150 m por onde passas fica teu. Se voltares ao ponto por onde já passaste e fechares um circuito, o que fica lá dentro também é teu.
      </p>
      <p className="muted t-small">Quando chegas perto de um lugar com missão, o telemóvel vibra e podes capturá-la sem parar a gravação.</p>
    </div>
  )
}

function Summary({ a, segments, name, setName }: { a: Activity; segments: Segment[]; name: string; setName: (v: string) => void }) {
  const game = useGame()
  const bike = a.type === 'bicicleta'
  const best = (seg: string) => {
    const times = game.activities.flatMap((x) => x.efforts.filter((e) => e.segment === seg).map((e) => e.timeS))
    return times.length ? Math.min(...times) : null
  }
  return (
    <div className="summary">
      <div className="field">
        <label htmlFor="act-name">Nome</label>
        <input id="act-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </div>
      {a.simulated && <p className="pill sim" style={{ justifySelf: 'start' }}>Simulação</p>}
      <div className="statgrid">
        <div>
          <b className="t-big num">{fmtKm(a.distanceM)}</b>
          <span>km</span>
        </div>
        <div>
          <b className="t-big num">{fmtClock(a.durationS * 1000)}</b>
          <span>tempo</span>
        </div>
        <div>
          <b className="t-big num">{fmtPace(a.distanceM, a.durationS * 1000, bike)}</b>
          <span>{bike ? 'km/h de média' : 'min/km de ritmo'}</span>
        </div>
        <div>
          <b className="t-big num">{fmtInt(a.gainM)}</b>
          <span>m a subir</span>
        </div>
        <div className="got">
          <b className="t-big num">{fmtInt(a.cells)}</b>
          <span>{a.loops ? `hexágonos, ${a.loops} ${a.loops === 1 ? 'circuito' : 'circuitos'}` : 'hexágonos novos'}</span>
        </div>
        <div>
          <b className="t-big num">{fmtInt(a.missions.length)}</b>
          <span>{a.missions.length === 1 ? 'missão' : 'missões'}</span>
        </div>
      </div>
      <ElevationChart profile={a.profile} />
      {a.efforts.length > 0 && (
        <div>
          <h3 className="section-t">Segmentos</h3>
          {a.efforts.map((e) => {
            const sg = segments.find((s) => s.id === e.segment)
            const b = best(e.segment)
            const pr = b === null || e.timeS < b
            return (
              <div className="seg-row" key={e.segment}>
                <span>
                  <b>{sg?.name ?? e.segment}</b>
                  <span className="muted t-small">
                    {' '}
                    {sg ? `${sg.km.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} km, ${sg.grade.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} %` : ''}
                  </span>
                </span>
                <span className="num">
                  {fmtClock(e.timeS * 1000)} {pr && <span className="xp">Recorde pessoal</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {a.missions.length > 0 && (
        <div>
          <h3 className="section-t">Missões cumpridas</h3>
          {a.missions.map((id) => {
            const m = missionById(id)
            const p = m && poiById(m.poi)
            if (!m || !p) return null
            return (
              <div className="seg-row" key={id}>
                <span>
                  <b>{m.title}</b>
                  <span className="muted t-small"> {p.name}</span>
                </span>
                <span className="xp">+{missionXp(game, id)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function boundsOf(pts: [number, number][]): [[number, number], [number, number]] | null {
  if (!pts.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return [
    [x0, y0],
    [x1, y1],
  ]
}
