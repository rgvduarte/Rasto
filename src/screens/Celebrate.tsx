// O momento da captura: missão cumprida (com selo e nível, quando há) ou circuito fechado.
import { useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { Glyph } from '../ui/bits'
import { useCelebrate, celebrate, arView } from '../lib/celebrate'
import { useGame, missionXp, collectionProgress, levelOf, xpOf, CELL_XP } from '../lib/store'
import { missionById } from '../data/missions'
import { poiById } from '../data/catalog'
import { arByPoi } from '../data/ar'
import { fmtInt } from '../lib/geo'
import { requestCompass } from './ArView'

export function Celebrate() {
  const c = useCelebrate()
  const game = useGame()

  useEffect(() => {
    if (c?.kind !== 'loop') return
    const t = setTimeout(() => celebrate.close(), 4200)
    return () => clearTimeout(t)
  }, [c])

  useEffect(() => {
    if (c?.kind !== 'mission') return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && celebrate.close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [c])

  if (!c) return null

  if (c.kind === 'loop') {
    const per = CELL_XP * (game.avatar?.kind === 'andarilho' ? 2 : 1)
    return (
      <div className="loop-banner" role="status">
        <span className="loop-hex" aria-hidden="true">
          <Icon name="hexagono" size={26} stroke={2.4} />
        </span>
        <span>
          <b>Circuito fechado</b>
          <span>
            +{fmtInt(c.cells)} {c.cells === 1 ? 'hexágono' : 'hexágonos'} lá dentro, +{fmtInt(c.cells * per)} XP
          </span>
        </span>
      </div>
    )
  }

  const m = missionById(c.missionId)
  const poi = m ? poiById(m.poi) : undefined
  if (!m || !poi) return null
  const xp = missionXp(game, m.id)
  const coll = collectionProgress(game).find((x) => x.id === m.collection)!
  const newSeal = coll.complete && !c.sealsBefore.includes(coll.id)
  const lvl = levelOf(xpOf(game).total)
  const levelUp = lvl.level > c.levelBefore
  const ar = arByPoi(poi.id)

  return (
    <div className="celebrate" role="dialog" aria-modal="true" aria-labelledby="cele-t" onClick={() => celebrate.close()}>
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <div className="burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
          <Glyph sub={poi.sub} fam={poi.fam} size={72} />
        </div>
        <h2 id="cele-t" className="t-title">
          {m.title}
        </h2>
        <p className="muted" style={{ marginTop: -8 }}>
          {poi.name}
        </p>
        <p className="big t-big">+{fmtInt(xp)} XP</p>
        <div className="cele-coll">
          <div className="coll-line">
            <b>{coll.name}</b>
            <span className="num">
              {Math.min(coll.done, coll.goal)} de {coll.goal}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.min(1, coll.done / coll.goal) * 100}%` }} />
          </div>
        </div>
        {newSeal && (
          <p className="cele-extra">
            Selo <b>{coll.seal}</b> conquistado, +{fmtInt(coll.bonus)} XP
          </p>
        )}
        {levelUp && (
          <p className="cele-extra">
            Subiste ao nível <b>{lvl.level}</b>
          </p>
        )}
        {ar && (
          <button
            className="btn line block"
            onClick={async () => {
              celebrate.close()
              await requestCompass()
              arView.open(poi.id)
            }}
          >
            <Icon name="camara" size={20} /> Ver em realidade aumentada
          </button>
        )}
        <button className="btn anil block" onClick={() => celebrate.close()} autoFocus>
          Continuar
        </button>
      </div>
    </div>
  )
}
