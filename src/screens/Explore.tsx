// Explorar: o mapa do concelho com pesquisa, filtros, a lista dos lugares e a ficha de cada um (Google Maps + TripAdvisor).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { BottomSheet, safeArea } from '../ui/BottomSheet'
import { AvatarDisc, Glyph, Stars } from '../ui/bits'
import { PlaceHead, PlaceBody } from './Place'
import { POIS, FAMILIES, SUB_LABEL, poiById } from '../data/catalog'
import { missionByPoi } from '../data/missions'
import type { Family, Poi } from '../data/types'
import { useGame, missionXp } from '../lib/store'
import { useRecorder, recorder } from '../lib/recorder'
import { mapView } from '../lib/mapview'
import { km, fmtDist, fmt1, fmtInt } from '../lib/geo'
import { go, type Route } from '../lib/router'
import { say, useViewportH } from '../lib/ui'
import { C } from '../map/style'

export const SERPA_CENTER = { lat: 37.9437, lon: -7.5967 }
type Filter = 'tudo' | Family | 'missao' | 'guardados'
const TAB_H = 62

const centered = { done: false }
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Explore({ route, narrow }: { route: Route; narrow: boolean }) {
  const game = useGame()
  const rec = useRecorder()
  const vh = useViewportH()
  const sel = route.params.get('p')
  const selected = sel ? poiById(sel) : undefined
  const filter = ((route.params.get('f') as Filter) || 'tudo') as Filter
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'perto' | 'ta'>('perto')
  const [snap, setSnap] = useState(0)
  const [fog, setFog] = useState(false)
  const [terrain, setTerrain] = useState(false)
  const [fly, setFly] = useState(false)
  const pushed = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  const pos = rec.pos
  const near = pos && km(pos, SERPA_CENTER) < 80 ? pos : null
  const origin = near ?? SERPA_CENTER

  const doneSet = useMemo(() => {
    const s = new Set<string>()
    for (const p of POIS) {
      const m = missionByPoi(p.id)
      if (m && game.done[m.id]) s.add(p.id)
    }
    return s
  }, [game.done])

  const list = useMemo(() => {
    const qq = norm(q.trim())
    return POIS.filter((p) => {
      if (filter === 'missao') return !!missionByPoi(p.id)
      if (filter === 'guardados') return game.saved.includes(p.id)
      return filter === 'tudo' || p.fam === filter
    })
      .filter((p) => !qq || norm(`${p.name} ${p.place} ${SUB_LABEL[p.sub]} ${p.freguesia ?? ''}`).includes(qq))
      .map((p) => ({ p, d: km(origin, p) }))
      .sort((a, b) => {
        if (sort === 'ta') {
          const ra = a.p.ta?.reviews ?? -1
          const rb = b.p.ta?.reviews ?? -1
          if (ra !== rb) return rb - ra
        }
        return a.d - b.d
      })
  }, [q, filter, sort, origin, game.saved])

  const pois = useMemo(() => list.map((x) => x.p), [list])

  // alturas da folha
  const sa = safeArea()
  const avail = vh - TAB_H - sa.bottom
  const snaps = selected ? [168, Math.round(avail * 0.52), avail - sa.top - 66] : [108, Math.round(avail * 0.48), avail - sa.top - 66]
  const sheetH = snaps[Math.min(snap, 2)]
  const padBottom = narrow ? TAB_H + sa.bottom + Math.min(sheetH, snaps[1]) : 0

  // o mapa mostra o que este ecrã pede
  useEffect(() => {
    mapView.set({
      mode: 'explore',
      pois,
      done: doneSet,
      selected: selected?.id ?? null,
      cells: fog ? 'fog' : 'conquered',
      track: null,
      follow: false,
      terrain,
      inRange: rec.inRange,
    })
  }, [pois, doneSet, selected, fog, terrain, rec.inRange])

  useEffect(() => {
    mapView.set({
      avatar: pos ? { lon: pos.lon, lat: pos.lat, heading: pos.heading } : null,
      user: pos ? { lon: pos.lon, lat: pos.lat, acc: pos.acc } : null,
      range: 80,
    })
  }, [pos])

  useEffect(() => {
    mapView.set({ pad: narrow ? { top: sa.top + (selected ? 70 : 112), bottom: padBottom, left: 0, right: 0 } : { top: 0, bottom: 0, left: 84 + 404, right: 0 } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, padBottom, !!selected])

  // ao escolher um lugar, a folha abre a meio; ao fechar, volta a espreitar
  useEffect(() => {
    setSnap(selected ? 1 : 0)
  }, [selected?.id])

  // toques no mapa
  useEffect(
    () =>
      mapView.onClick((id) => {
        if (id) pick(id)
        else if (selected) close()
        else if (narrow) setSnap(0)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, narrow, filter],
  )

  // a primeira posição da sessão, dentro do concelho, põe o mapa à tua volta (como no Pokémon GO)
  useEffect(() => {
    if (!pos || centered.done || selected) return
    centered.done = true
    if (km(pos, SERPA_CENTER) < 45) mapView.camera({ kind: 'fly', lon: pos.lon, lat: pos.lat, zoom: 15.6, pitch: 40 })
  }, [pos, selected])

  // primeira posição depois de carregar em "onde estou"
  useEffect(() => {
    if (!fly || !pos) return
    setFly(false)
    const d = km(pos, SERPA_CENTER)
    if (d < 45) mapView.camera({ kind: 'fly', lon: pos.lon, lat: pos.lat, zoom: 16, pitch: terrain ? 60 : 40 })
    else say(`Estás a ${fmtDist(d)} de Serpa. A lista mostra o que fica mais perto de ti.`, 4200)
  }, [fly, pos, terrain])

  function pick(id: string) {
    const params: Record<string, string | undefined> = { p: id, f: filter === 'tudo' ? undefined : filter }
    if (selected) go('/', params, true)
    else {
      pushed.current = true
      go('/', params)
    }
  }
  function close() {
    if (pushed.current) {
      pushed.current = false
      history.back()
    } else go('/', { f: filter === 'tudo' ? undefined : filter }, true)
  }
  function setFilter(f: Filter) {
    go('/', { f: f === 'tudo' ? undefined : f }, true)
  }

  const locate = () => {
    if (pos) {
      const d = km(pos, SERPA_CENTER)
      if (d < 45) mapView.camera({ kind: 'fly', lon: pos.lon, lat: pos.lat, zoom: 16, pitch: terrain ? 60 : 40 })
      else say(`Estás a ${fmtDist(d)} de Serpa.`)
      return
    }
    if (rec.error) say(rec.error, 4200)
    recorder.watch()
    setFly(true)
    say('A procurar a tua posição…')
  }

  const title =
    filter === 'guardados' ? 'Guardados' : filter === 'missao' ? 'Com missão' : filter === 'tudo' ? (near ? 'Perto de ti' : 'No concelho de Serpa') : FAMILIES.find((f) => f.id === filter)!.label

  const search = (
    <div className={`search${narrow ? ' float' : ''}`} role="search">
      {selected && narrow ? (
        <button className="iconbtn" onClick={close} aria-label="Voltar à lista" style={{ marginLeft: -10, background: 'none' }}>
          <Icon name="voltar" />
        </button>
      ) : (
        <Icon name="procurar" size={21} style={{ color: 'var(--xisto)', flex: 'none' }} />
      )}
      <label className="vh" htmlFor="q">
        Procurar em Serpa
      </label>
      <input
        id="q"
        ref={input}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Procurar em Serpa"
        value={selected && narrow ? selected.name : q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (selected) close()
          if (narrow) setSnap(2)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {q && !selected && (
        <button className="iconbtn" style={{ width: 36, height: 36, background: 'none' }} onClick={() => setQ('')} aria-label="Limpar a pesquisa">
          <Icon name="fechar" size={20} />
        </button>
      )}
      <a className="me-btn" href="#/perfil" aria-label="O teu perfil">
        <AvatarDisc kind={game.avatar?.kind} ring={game.avatar?.ring} size={38} />
      </a>
    </div>
  )

  const chips = (
    <div className={`chips${narrow ? ' floating' : ''}`} role="group" aria-label="Filtrar">
      <button className="chip" aria-pressed={filter === 'tudo'} onClick={() => setFilter('tudo')}>
        Tudo
      </button>
      {FAMILIES.map((f) => (
        <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(filter === f.id ? 'tudo' : f.id)} title={f.hint}>
          <span className="dot" style={{ background: C[f.id] }} />
          {f.label}
        </button>
      ))}
      <button className="chip" aria-pressed={filter === 'missao'} onClick={() => setFilter(filter === 'missao' ? 'tudo' : 'missao')}>
        <Icon name="missoes" size={17} /> Com missão
      </button>
      {(game.saved.length > 0 || filter === 'guardados') && (
        <button className="chip" aria-pressed={filter === 'guardados'} onClick={() => setFilter(filter === 'guardados' ? 'tudo' : 'guardados')}>
          <Icon name="guardar" size={17} /> Guardados
        </button>
      )}
    </div>
  )

  const listHead = (
    <div className="list-head">
      <h2>
        {title} <span className="muted num">{fmtInt(list.length)}</span>
      </h2>
      <div className="seg" role="group" aria-label="Ordenar">
        <button aria-pressed={sort === 'perto'} onClick={() => setSort('perto')}>
          Perto
        </button>
        <button aria-pressed={sort === 'ta'} onClick={() => setSort('ta')}>
          TripAdvisor
        </button>
      </div>
    </div>
  )

  const listBody = (
    <div className="rows">
      {list.map(({ p, d }) => (
        <Row key={p.id} p={p} d={d} done={doneSet.has(p.id)} xp={missionByPoi(p.id) ? missionXp(game, missionByPoi(p.id)!.id) : 0} onPick={pick} />
      ))}
      {!list.length && (
        <p className="empty">
          {filter === 'guardados' ? 'Ainda não guardaste nenhum lugar. Abre uma ficha e carrega em Guardar.' : `Nada com “${q}”. Experimenta queijo, Pias ou igreja.`}
        </p>
      )}
      <p className="note rows-note">
        Lugares do OpenStreetMap e do Overture Maps, com a classificação do TripAdvisor de 13 out 2026 quando existe.{' '}
        <a href="#/sobre">Fontes</a>
      </p>
    </div>
  )

  const head = selected ? <PlaceHead poi={selected} origin={origin} onClose={close} /> : listHead
  const body = selected ? <PlaceBody poi={selected} origin={origin} hasUser={!!near} onPick={pick} /> : listBody

  const mapBtns = (
    <div className="mapbtns" style={narrow ? { bottom: padBottom + 12 } : undefined}>
      <button className="iconbtn float" aria-pressed={terrain} onClick={() => setTerrain(!terrain)} aria-label={terrain ? 'Desligar o relevo 3D' : 'Ver o relevo em 3D'} title="Relevo 3D">
        <Icon name="relevo" />
      </button>
      <button className="iconbtn float" aria-pressed={fog} onClick={() => setFog(!fog)} aria-label={fog ? 'Esconder a grelha do território' : 'Ver o território por conquistar'} title="Território">
        <Icon name="hexagono" />
      </button>
      <button className="iconbtn float" aria-pressed={!!pos} onClick={locate} aria-label="Onde estou" title="Onde estou">
        <Icon name="localizar" />
      </button>
    </div>
  )

  if (!narrow)
    return (
      <>
        <aside className="panel" aria-label="Lugares">
          {search}
          {!selected && chips}
          {head}
          <div className="panel-scroll" key={selected?.id ?? 'lista'}>
            {body}
          </div>
        </aside>
        {mapBtns}
      </>
    )

  return (
    <>
      {search}
      {!selected && chips}
      {mapBtns}
      <BottomSheet snaps={snaps} index={snap} onIndex={setSnap} header={head} label={selected ? selected.name : 'Lugares'} resetKey={selected?.id ?? 'lista'}>
        {body}
      </BottomSheet>
    </>
  )
}

function Row({ p, d, done, xp, onPick }: { p: Poi; d: number; done: boolean; xp: number; onPick: (id: string) => void }) {
  return (
    <button className="row-btn" onClick={() => onPick(p.id)}>
      <Glyph sub={p.sub} fam={p.fam} done={done} />
      <span>
        <span className="row-name">{p.name}</span>
        <span className="row-meta">
          {SUB_LABEL[p.sub]}, {p.placeKm < 1 ? p.place : `perto de ${p.place}`}
        </span>
        {p.ta?.rating ? (
          <span className="row-ta">
            <b className="num">{fmt1(p.ta.rating)}</b>
            <Stars value={p.ta.rating} size={13} />
            <span className="num">({fmtInt(p.ta.reviews ?? 0)})</span>
          </span>
        ) : null}
      </span>
      <span className="row-right">
        <span className="num">{fmtDist(d)}</span>
        {xp > 0 && (done ? <span className="xp got">feita</span> : <span className="xp">+{xp}</span>)}
      </span>
    </button>
  )
}
