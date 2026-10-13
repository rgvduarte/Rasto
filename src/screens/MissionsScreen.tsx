// Missões: as coleções do concelho, o teu nível e a missão mais perto de ti.
import { useEffect, useMemo } from 'react'
import { Page } from './Page'
import { Glyph } from '../ui/bits'
import { Icon } from '../ui/Icon'
import { COLLECTIONS, MISSIONS } from '../data/missions'
import { POIS, poiById, SUB_LABEL } from '../data/catalog'
import { useGame, xpOf, levelOf, collectionProgress, missionXp } from '../lib/store'
import { useRecorder } from '../lib/recorder'
import { mapView } from '../lib/mapview'
import { km, fmtDist, fmtInt } from '../lib/geo'
import { href } from '../lib/router'
import { SERPA_CENTER } from './Explore'

const MISSION_POIS = POIS.filter((p) => MISSIONS.some((m) => m.poi === p.id))

export function MissionsScreen({ narrow }: { narrow: boolean }) {
  const game = useGame()
  const rec = useRecorder()
  const xp = xpOf(game)
  const lvl = levelOf(xp.total)
  const colls = collectionProgress(game)
  const doneCount = Object.keys(game.done).length
  const origin = rec.pos && km(rec.pos, SERPA_CENTER) < 60 ? rec.pos : null

  const next = useMemo(() => {
    if (!origin) return null
    return (
      MISSIONS.filter((m) => !game.done[m.id])
        .map((m) => ({ m, p: poiById(m.poi)!, d: km(origin, poiById(m.poi)!) }))
        .sort((a, b) => a.d - b.d)[0] ?? null
    )
  }, [origin, game.done])

  const doneSet = useMemo(() => new Set(MISSIONS.filter((m) => game.done[m.id]).map((m) => m.poi)), [game.done])
  useEffect(() => {
    mapView.set({ mode: 'explore', pois: MISSION_POIS, done: doneSet, selected: null, cells: 'conquered', track: null, follow: false, pad: narrow ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 0, bottom: 0, left: 84 + 404, right: 0 } })
  }, [doneSet, narrow])

  return (
    <Page narrow={narrow} title="Missões">
      <div className="xp-card">
        <div className="xp-top">
          <span className="t-sub">Nível {lvl.level}</span>
          <span className="num t-small muted">
            faltam {fmtInt(lvl.need - lvl.into)} XP para o {lvl.level + 1}
          </span>
        </div>
        <p className="xp-total">
          <b className="t-display num">{fmtInt(xp.total)}</b> XP
        </p>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={lvl.need} aria-valuenow={lvl.into} aria-label="Progresso do nível">
          <i style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
        </div>
        <p className="t-small muted">
          {doneCount} de {MISSIONS.length} missões, {fmtInt(xp.base)} XP. Território: {fmtInt(game.cells.length)} hexágonos, {fmtInt(xp.cells)} XP.
          {xp.bonus ? ` Selos: ${fmtInt(xp.bonus)} XP.` : ''}
        </p>
      </div>

      {next && (
        <section>
          <h2 className="section-t">A mais perto de ti</h2>
          <a className="next-card" href={href('/', { p: next.p.id })}>
            <Glyph sub={next.p.sub} fam={next.p.fam} size={48} />
            <span>
              <b>{next.m.title}</b>
              <span className="muted t-small">
                {next.p.name !== next.m.title ? `${next.p.name}, a ` : 'A '}
                {fmtDist(next.d)}
              </span>
            </span>
            <span className="xp">+{missionXp(game, next.m.id)}</span>
          </a>
        </section>
      )}

      {colls.map((c) => {
        const ms = MISSIONS.filter((m) => m.collection === c.id)
        return (
          <section className="coll" key={c.id}>
            <div className="coll-head">
              <h2>{c.name}</h2>
              <span className={`seal${c.complete ? ' on' : ''}`}>{c.complete ? `Selo ${c.seal}` : `${Math.min(c.done, c.goal)} de ${c.goal}`}</span>
            </div>
            <p className="muted t-small">
              {c.lede} Com {c.goal} ganhas o selo {c.seal} e mais {fmtInt(c.bonus)} XP.
            </p>
            <div className="bar">
              <i style={{ width: `${Math.min(1, c.done / c.goal) * 100}%` }} />
            </div>
            <div className="rows flush">
              {ms.map((m) => {
                const p = poiById(m.poi)!
                const d = !!game.done[m.id]
                return (
                  <a className="row-btn" href={href('/', { p: p.id })} key={m.id}>
                    <Glyph sub={p.sub} fam={p.fam} done={d} />
                    <span>
                      <span className="row-name">{m.title}</span>
                      <span className="row-meta">
                        {p.name !== m.title ? p.name : `${SUB_LABEL[p.sub]}, ${p.place}`}
                        {m.check === 'codigo' ? ', com código do parceiro' : ''}
                      </span>
                    </span>
                    <span className="row-right">
                      {d ? (
                        <span className="xp got">
                          <Icon name="check" size={14} stroke={3} /> feita
                        </span>
                      ) : (
                        <span className="xp">+{missionXp(game, m.id)}</span>
                      )}
                    </span>
                  </a>
                )
              })}
            </div>
          </section>
        )
      })}
      <p className="note">
        As missões de visita contam com o GPS do telemóvel, a menos de 60 a 300 m do lugar. As de restaurantes e produtores pedem um código dado ao balcão, quando o
        parceiro aderir.
      </p>
      {COLLECTIONS.length === 0 && null}
    </Page>
  )
}
