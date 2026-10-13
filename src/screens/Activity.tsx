// Atividade: o diário das tuas saídas (Strava), com o percurso no mapa, o perfil de altitude, os segmentos e os recordes.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { BottomSheet, safeArea } from '../ui/BottomSheet'
import { TrackThumb, ElevationChart, Splits } from '../ui/bits'
import { Page } from './Page'
import { useGame, store, totals, missionXp, type Activity as Act } from '../lib/store'
import { mapView } from '../lib/mapview'
import { loadSim, type Segment } from '../lib/sim'
import { missionById } from '../data/missions'
import { poiById } from '../data/catalog'
import { fmtInt } from '../lib/geo'
import { fmtClock, fmtDur, fmtKm, fmtPace, fmtDay, share, useViewportH } from '../lib/ui'
import { go, href, type Route } from '../lib/router'
import { boundsOf } from './Record'
import { shareCard } from './shareCard'

const TAB_H = 62
const TYPE: Record<string, string> = { caminhada: 'Caminhada', corrida: 'Corrida', bicicleta: 'Bicicleta' }

export function Activity({ route, narrow }: { route: Route; narrow: boolean }) {
  const game = useGame()
  const id = route.params.get('a')
  const a = id ? game.activities.find((x) => x.id === id) : undefined
  const [segments, setSegments] = useState<Segment[]>([])
  useEffect(() => {
    loadSim().then((d) => setSegments(d.segments))
  }, [])
  if (a) return <Detail a={a} narrow={narrow} segments={segments} />
  return <Feed narrow={narrow} segments={segments} />
}

function useBest() {
  const game = useGame()
  return useMemo(() => {
    const best = new Map<string, { timeS: number; act: string; n: number }>()
    for (const a of game.activities)
      for (const e of a.efforts) {
        const b = best.get(e.segment)
        if (!b || e.timeS < b.timeS) best.set(e.segment, { timeS: e.timeS, act: a.id, n: (b?.n ?? 0) + 1 })
        else b.n++
      }
    return best
  }, [game.activities])
}

function Feed({ narrow, segments }: { narrow: boolean; segments: Segment[] }) {
  const game = useGame()
  const t = totals(game)
  const best = useBest()
  const sa = safeArea()

  useEffect(() => {
    mapView.set({
      mode: 'review',
      pois: [],
      selected: null,
      cells: 'conquered',
      track: game.activities.length ? game.activities.map((a) => a.track.map((p) => [p[0], p[1]] as [number, number])) : null,
      avatar: null,
      follow: false,
      inRange: [],
      terrain: false,
      pad: narrow ? { top: sa.top, bottom: TAB_H + sa.bottom, left: 0, right: 0 } : { top: 0, bottom: 0, left: 84 + 404, right: 0 },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.activities, narrow])

  return (
    <Page narrow={narrow} title="Atividade">
      {game.activities.length === 0 ? (
        <div className="empty-state">
          <p className="t-sub">Ainda não gravaste nenhuma saída.</p>
          <p className="muted">Carrega em Gravar e anda: cada hexágono por onde passas fica teu, e as missões perto de ti aparecem no caminho.</p>
          <a className="btn anil" href={href('/gravar')}>
            <Icon name="gravar" size={20} /> Gravar
          </a>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div>
              <b className="t-big num">{t.km.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</b>
              <span>km no total</span>
            </div>
            <div>
              <b className="t-big num">{fmtDur(t.time)}</b>
              <span>em movimento</span>
            </div>
            <div>
              <b className="t-big num">{fmtInt(t.gain)}</b>
              <span>m a subir</span>
            </div>
          </div>
          <div className="acts">
            {game.activities.map((a) => (
              <a key={a.id} className="act-card" href={href('/atividade', { a: a.id })}>
                <TrackThumb track={a.track} />
                <span>
                  <span className="row-name">{a.name}</span>
                  <span className="row-meta">
                    {fmtDay(a.startedAt)}, {TYPE[a.type].toLowerCase()}
                  </span>
                  <span className="act-stats num">
                    <span>
                      <b>{fmtKm(a.distanceM)}</b> km
                    </span>
                    <span>
                      <b>{fmtClock(a.durationS * 1000)}</b>
                    </span>
                    <span>
                      <b>{fmtInt(a.gainM)}</b> m
                    </span>
                  </span>
                  <span className="act-tags">
                    {a.cells > 0 && <span className="xp">+{fmtInt(a.cells)} hexágonos</span>}
                    {a.missions.length > 0 && (
                      <span className="pill">
                        {a.missions.length} {a.missions.length === 1 ? 'missão' : 'missões'}
                      </span>
                    )}
                    {a.simulated && <span className="pill sim">Simulação</span>}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </>
      )}
      <section>
        <h2 className="section-t">Segmentos</h2>
        <p className="note" style={{ marginBottom: 6 }}>
          Troços cronometrados sobre caminhos reais do OpenStreetMap. Por agora só contam os teus tempos: os rankings chegam com as contas.
        </p>
        {segments.map((s) => {
          const b = best.get(s.id)
          return (
            <div className="seg-row" key={s.id}>
              <span>
                <b>{s.name}</b>
                <span className="muted t-small">
                  {' '}
                  {s.km.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} km, {s.grade.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} % de média
                </span>
              </span>
              <span className="num">{b ? fmtClock(b.timeS * 1000) : <span className="muted">por fazer</span>}</span>
            </div>
          )
        })}
      </section>
    </Page>
  )
}

function Detail({ a, narrow, segments }: { a: Act; narrow: boolean; segments: Segment[] }) {
  const game = useGame()
  const best = useBest()
  const sa = safeArea()
  const vh = useViewportH()
  const avail = vh - TAB_H - sa.bottom
  const snaps = [190, Math.round(avail * 0.5), avail - sa.top - 12]
  const [snap, setSnap] = useState(1)
  const fitted = useRef<string | null>(null)
  const bike = a.type === 'bicicleta'

  useEffect(() => {
    mapView.set({
      mode: 'review',
      pois: [],
      selected: null,
      cells: 'conquered',
      track: [a.track.map((p) => [p[0], p[1]] as [number, number])],
      avatar: null,
      follow: false,
      inRange: [],
      terrain: false,
    })
  }, [a])

  useEffect(() => {
    mapView.set({ pad: narrow ? { top: sa.top + 60, bottom: TAB_H + sa.bottom + Math.min(snaps[snap], snaps[1]), left: 0, right: 0 } : { top: 0, bottom: 0, left: 84 + 404, right: 0 } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, snap, vh])

  useEffect(() => {
    if (fitted.current === a.id) return
    fitted.current = a.id
    const b = boundsOf(a.track.map((p) => [p[0], p[1]]))
    if (b) setTimeout(() => mapView.camera({ kind: 'fit', bounds: b, maxZoom: 16 }), 80)
  }, [a.id, a.track])

  const body = (
    <div className="summary">
      <div className="detail-top">
        <a className="iconbtn soft" href={href('/atividade')} aria-label="Voltar às atividades">
          <Icon name="voltar" />
        </a>
        <div className="grow">
          <h2 className="t-title">{a.name}</h2>
          <p className="muted t-small">
            {fmtDay(a.startedAt)}, {TYPE[a.type].toLowerCase()}
            {a.simulated ? ', simulação' : ''}
          </p>
        </div>
      </div>
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
      <Splits track={a.track} bike={bike} />
      {a.efforts.length > 0 && (
        <div>
          <h3 className="section-t">Segmentos</h3>
          {a.efforts.map((e) => {
            const sg = segments.find((s) => s.id === e.segment)
            const b = best.get(e.segment)
            const pr = b && b.act === a.id
            return (
              <div className="seg-row" key={e.segment}>
                <span>
                  <b>{sg?.name ?? e.segment}</b>
                  <span className="muted t-small"> {sg ? `${sg.km.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} km` : ''}</span>
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
              <a className="seg-row" key={id} href={href('/', { p: p.id })}>
                <span>
                  <b>{m.title}</b>
                  {p.name !== m.title && <span className="muted t-small"> {p.name}</span>}
                </span>
                <span className="xp">+{missionXp(game, id)}</span>
              </a>
            )
          })}
        </div>
      )}
      <div className="sum-actions">
        <button
          className="btn anil block"
          onClick={async () => {
            const file = await shareCard(a, game)
            await share({ title: a.name, text: `${a.name}: ${fmtKm(a.distanceM)} km no Rasto Serpa`, files: file ? [file] : undefined })
          }}
        >
          <Icon name="partilhar" size={20} /> Partilhar imagem
        </button>
        <button
          className="btn line block"
          onClick={() => {
            if (confirm('Apagar esta atividade? Os hexágonos e as missões ficam.')) {
              store.deleteActivity(a.id)
              go('/atividade', undefined, true)
            }
          }}
        >
          Apagar
        </button>
      </div>
    </div>
  )

  if (!narrow)
    return (
      <aside className="panel">
        <div className="panel-scroll">{body}</div>
      </aside>
    )
  return (
    <BottomSheet snaps={snaps} index={snap} onIndex={setSnap} label={a.name} resetKey={a.id}>
      {body}
    </BottomSheet>
  )
}
