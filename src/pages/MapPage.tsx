import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MLMap } from 'maplibre-gl'
import { TerritoryMap } from '../components/TerritoryMap'
import { Glyph } from '../components/Glyph'
import { MissionAction } from '../components/MissionAction'
import { POIS, FAMILIES, SUB_LABEL, poiById } from '../data/catalog'
import { missionByPoi } from '../data/missions'
import type { Family, Poi } from '../data/types'
import { useGame, freguesiaProgress } from '../lib/store'
import { km, fmtDist, directionsUrl, osmUrl, walkMin, driveMin, fmtMin, fmt1, fmtInt } from '../lib/geo'
import { go, type Route } from '../lib/router'
import { C } from '../map/style'

const SERPA_CENTER = { lat: 37.9437, lon: -7.5967 }

export function MapPage({ route }: { route: Route }) {
  const game = useGame()
  const sel = route.params.get('p')
  const famParam = route.params.get('f') as Family | null
  const [q, setQ] = useState('')
  const [onlyMissions, setOnlyMissions] = useState(false)
  const [sortBy, setSortBy] = useState<'perto' | 'ta'>('perto')
  const [terrain, setTerrain] = useState(false)
  const [user, setUser] = useState<{ lat: number; lon: number; acc: number } | null>(null)
  const [sheet, setSheet] = useState<'min' | 'mid' | 'max'>('mid')
  const [locMsg, setLocMsg] = useState<string | null>(null)
  const mapRef = useRef<MLMap | null>(null)
  const watchId = useRef<number | null>(null)

  const done = useMemo(() => {
    const s = new Set<string>()
    for (const p of POIS) {
      const m = missionByPoi(p.id)
      if (m && game.done[m.id]) s.add(p.id)
    }
    return s
  }, [game.done])

  const origin = user ?? SERPA_CENTER

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return POIS.filter((p) => (!famParam || p.fam === famParam))
      .filter((p) => !onlyMissions || missionByPoi(p.id))
      .filter(
        (p) =>
          !qq ||
          p.name.toLowerCase().includes(qq) ||
          p.place.toLowerCase().includes(qq) ||
          SUB_LABEL[p.sub].toLowerCase().includes(qq) ||
          (p.freguesia ?? '').toLowerCase().includes(qq),
      )
      .map((p) => ({ p, d: km(origin, p) }))
      .sort((a, b) => {
        if (sortBy === 'ta') {
          const ra = a.p.ta?.reviews ?? -1
          const rb = b.p.ta?.reviews ?? -1
          if (ra !== rb) return rb - ra
        }
        return a.d - b.d
      })
  }, [famParam, onlyMissions, q, origin, sortBy])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: POIS.length }
    for (const p of POIS) c[p.fam] = (c[p.fam] ?? 0) + 1
    return c
  }, [])

  const progress = useMemo(() => freguesiaProgress(game).map((f) => ({ name: f.name, p: f.p })), [game])
  const selected = sel ? poiById(sel) : undefined

  useEffect(() => {
    if (selected && sheet === 'min') setSheet('mid')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel])

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
  }, [])

  const setParam = (k: string, v: string | null) => {
    const next: Record<string, string | undefined> = {}
    route.params.forEach((val, key) => (next[key] = val))
    if (v === null) delete next[k]
    else next[k] = v
    go('/mapa', next, true)
  }

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocMsg('Este browser não dá a localização.')
      return
    }
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
      setUser(null)
      return
    }
    setLocMsg('A procurar…')
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const u = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy }
        setUser((prev) => {
          if (!prev) {
            const inArea = u.lat > 37.6 && u.lat < 38.3 && u.lon > -7.9 && u.lon < -7.1
            if (inArea) mapRef.current?.easeTo({ center: [u.lon, u.lat], zoom: 15 })
            setLocMsg(inArea ? null : `Estás a ${fmtDist(km(u, SERPA_CENTER))} de Serpa. A lista mostra o mais perto de ti.`)
          }
          return u
        })
      },
      () => {
        setLocMsg('Sem acesso à localização.')
        watchId.current = null
      },
      { enableHighAccuracy: true, maximumAge: 15000 },
    )
  }

  return (
    <div className="mapapp">
      <aside className={`side ${sheet}`} aria-label="Lugares">
        <div className="side-head" style={selected ? { borderBottom: 0, paddingBottom: 0 } : undefined}>
          <button
            className="grip"
            aria-label={sheet === 'max' ? 'Encolher a lista' : 'Expandir a lista'}
            onClick={() => setSheet(sheet === 'max' ? 'min' : sheet === 'min' ? 'mid' : 'max')}
          />
          {!selected && (
            <>
              <label className="vh" htmlFor="q">
                Procurar
              </label>
              <input
                id="q"
                className="search"
                type="search"
                placeholder="Procurar lugar, aldeia ou tipo"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setSheet('max')}
              />
              <div className="chips" role="group" aria-label="Filtrar">
                <button className="chip" aria-pressed={!famParam} onClick={() => setParam('f', null)}>
                  Tudo <span className="n">{counts.all}</span>
                </button>
                {FAMILIES.map((f) => (
                  <button key={f.id} className="chip" aria-pressed={famParam === f.id} onClick={() => setParam('f', famParam === f.id ? null : f.id)} title={f.hint}>
                    <span className="dot" style={{ background: C[f.id] }} />
                    {f.label} <span className="n">{counts[f.id]}</span>
                  </button>
                ))}
                <button className="chip" aria-pressed={onlyMissions} onClick={() => setOnlyMissions(!onlyMissions)}>
                  Com missão
                </button>
              </div>
            </>
          )}
        </div>
        <div className="side-body">
          {selected ? (
            <PoiDetail poi={selected} origin={origin} hasUser={!!user} onBack={() => setParam('p', null)} onPick={(id) => setParam('p', id)} />
          ) : (
            <>
              {locMsg && <p className="small muted" style={{ padding: '10px 16px 0' }}>{locMsg}</p>}
              <div className="row" style={{ padding: '10px 16px 4px', justifyContent: 'space-between' }}>
                <span className="small muted">
                  {fmtInt(filtered.length)} lugares ·{' '}
                  {sortBy === 'ta' ? 'mais opiniões no TripAdvisor primeiro' : user ? 'mais perto de ti primeiro' : 'mais perto do centro de Serpa primeiro'}
                </span>
                <span className="row" role="group" aria-label="Ordenar" style={{ gap: 4 }}>
                  <button className="chip" style={{ minHeight: 30, padding: '0 10px', fontSize: 13 }} aria-pressed={sortBy === 'perto'} onClick={() => setSortBy('perto')}>
                    Perto
                  </button>
                  <button className="chip" style={{ minHeight: 30, padding: '0 10px', fontSize: 13 }} aria-pressed={sortBy === 'ta'} onClick={() => setSortBy('ta')}>
                    TripAdvisor
                  </button>
                </span>
              </div>
              <ul className="plist">
                {filtered.map(({ p, d }) => {
                  const m = missionByPoi(p.id)
                  const isDone = done.has(p.id)
                  return (
                    <li key={p.id}>
                      <button onClick={() => setParam('p', p.id)}>
                        <Glyph sub={p.sub} fam={p.fam} done={isDone} />
                        <span>
                          <span className="nm">{p.name}</span>
                          <span className="meta">
                            {SUB_LABEL[p.sub]} · {p.placeKm < 1 ? p.place : `perto de ${p.place}`}
                            {p.ta?.rating ? ` · TripAdvisor ${fmt1(p.ta.rating)}${p.ta.reviews ? ` (${fmtInt(p.ta.reviews)})` : ''}` : ''}
                          </span>
                        </span>
                        <span className="rt">
                          <span>{fmtDist(d)}</span>
                          {m && (isDone ? <span className="tag done">feita</span> : <span className="tag xp">+{m.xp}</span>)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {!filtered.length && <p style={{ padding: 16 }}>Nada com esse nome. Experimenta “queijo”, “Pias” ou “igreja”.</p>}
            </>
          )}
        </div>
      </aside>
      <div className="mapwrap">
        <TerritoryMap
          pois={filtered.map((x) => x.p)}
          done={done}
          selected={sel}
          onSelect={(id) => setParam('p', id)}
          progress={progress}
          terrain={terrain}
          user={user}
          onReady={(m) => (mapRef.current = m)}
        />
        <div className="map-tools">
          <button className="tool" aria-pressed={terrain} onClick={() => setTerrain(!terrain)}>
            Relevo 3D
          </button>
          <button className="tool" aria-pressed={!!user} onClick={locate}>
            {user ? 'A seguir a tua posição' : 'Onde estou'}
          </button>
        </div>
        <div className="legend" aria-label="Legenda">
          {FAMILIES.map((f) => (
            <div className="li" key={f.id}>
              <span className="sw" style={{ background: C[f.id] }} />
              <span>
                <b>{f.label}</b> · {f.hint.toLowerCase()}
              </span>
            </div>
          ))}
          <div className="li">
            <span className="ln" />
            <span>Estradão de terra (OpenStreetMap). Muitos atravessam herdades: respeita portões e vedações.</span>
          </div>
          <div className="li">
            <span className="sw" style={{ background: 'rgba(196,138,18,0.35)', borderRadius: 3 }} />
            <span>Freguesia que já exploraste</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PoiDetail({
  poi,
  origin,
  hasUser,
  onBack,
  onPick,
}: {
  poi: Poi
  origin: { lat: number; lon: number }
  hasUser: boolean
  onBack: () => void
  onPick: (id: string) => void
}) {
  const m = missionByPoi(poi.id)
  const d = km(origin, poi)
  const near = POIS.filter((p) => p.id !== poi.id)
    .map((p) => ({ p, d: km(poi, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4)
  const fam = FAMILIES.find((f) => f.id === poi.fam)!
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Todos os lugares
      </button>
      <div className="row" style={{ marginTop: 8 }}>
        <Glyph sub={poi.sub} fam={poi.fam} />
        <span className="small muted">
          {fam.label} · {SUB_LABEL[poi.sub]}
        </span>
      </div>
      <h2>{poi.name}</h2>
      <p className="where">
        {poi.placeKm < 1 ? poi.place : `${fmt1(poi.placeKm)} km de ${poi.place}`}
        {poi.freguesia ? ` · freguesia de ${poi.freguesia}` : ''}
      </p>
      <p className="sum">{poi.summary}</p>
      {m && <MissionAction mission={m} poi={poi} />}
      <div className="links">
        <a className="btn small" href={directionsUrl(poi)} target="_blank" rel="noreferrer">
          Como chegar <span className="ext">↗</span>
        </a>
        {poi.web && (
          <a className="btn ghost small" href={poi.web} target="_blank" rel="noreferrer">
            Site <span className="ext">↗</span>
          </a>
        )}
        {poi.ta?.url && (
          <a className="btn ghost small" href={poi.ta.url} target="_blank" rel="noreferrer">
            TripAdvisor <span className="ext">↗</span>
          </a>
        )}
      </div>
      <dl className="kv">
        <dt>{hasUser ? 'De ti' : 'Do centro de Serpa'}</dt>
        <dd>
          {fmtDist(d)} em linha reta · {d < 2 ? `≈ ${fmtMin(walkMin(d))} a pé` : `≈ ${fmtMin(driveMin(d))} de carro`}
        </dd>
        {poi.ta && (
          <>
            <dt>TripAdvisor</dt>
            <dd>
              {[
                poi.ta.rank && poi.ta.of ? `n.º ${poi.ta.rank} de ${poi.ta.of} (${poi.ta.list}) em ${poi.ta.geo ?? 'Serpa'}` : null,
                poi.ta.rating ? `${fmt1(poi.ta.rating)} de 5` : null,
                poi.ta.reviews ? `${fmtInt(poi.ta.reviews)} opiniões` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'listado, sem avaliações'}
              <span className="muted"> · recolha de 13 out 2026</span>
            </dd>
          </>
        )}
        <dt>Posição</dt>
        <dd>
          <a href={osmUrl(poi)} target="_blank" rel="noreferrer">
            {poi.source.dataset === 'osm' ? 'OpenStreetMap' : 'Overture Maps'}
          </a>
          {poi.approx ? <span className="muted"> · pela morada, aproximada</span> : null}
        </dd>
      </dl>
      <div className="near">
        <h4>Perto daqui</h4>
        <ul className="plist">
          {near.map(({ p, d: dd }) => (
            <li key={p.id}>
              <button onClick={() => onPick(p.id)}>
                <Glyph sub={p.sub} fam={p.fam} />
                <span>
                  <span className="nm">{p.name}</span>
                  <span className="meta">{SUB_LABEL[p.sub]}</span>
                </span>
                <span className="rt">{fmtDist(dd)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
