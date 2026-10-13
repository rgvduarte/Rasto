// Eventos no concelho. O primeiro é o HELL160: o live e o Hell Wall estão no site da prova; aqui fica o que fazer enquanto se espera.
import { useMemo, useState } from 'react'
import { Page } from './Page'
import { Glyph } from '../ui/bits'
import { HELL160, COURSE_VILLAGES } from '../data/hell160'
import { POIS, poiById, SUB_LABEL } from '../data/catalog'
import { missionByPoi } from '../data/missions'
import { useGame, missionXp } from '../lib/store'
import { km, walkMin, driveMin, fmtMin, fmtInt } from '../lib/geo'
import { href } from '../lib/router'

const WINDOWS = [30, 60, 90, 120]
const STAY: Record<string, number> = { restaurante: 60, petiscos: 40, pizzaria: 45, pastelaria: 15, museu: 40, queijo: 25, vinho: 40, loja: 15 }

function cost(d: number, sub: string) {
  const walk = d <= 1.3
  const oneWay = walk ? walkMin(d) : driveMin(d)
  return { walk, total: oneWay * 2 + (STAY[sub] ?? 15), oneWay }
}

export function Events({ narrow }: { narrow: boolean }) {
  const game = useGame()
  const [v, setV] = useState(COURSE_VILLAGES[0].name)
  const [w, setW] = useState(60)
  const village = COURSE_VILLAGES.find((x) => x.name === v) ?? COURSE_VILLAGES[0]
  const anchor = poiById(village.poi)!
  const plan = useMemo(
    () =>
      POIS.filter((p) => p.fam !== 'ficar')
        .map((p) => {
          const d = km(anchor, p)
          return { p, d, c: cost(d, p.sub), m: missionByPoi(p.id) }
        })
        .filter((x) => x.c.total <= w)
        .sort((a, b) => (b.m ? 1 : 0) - (a.m ? 1 : 0) || a.c.total - b.c.total)
        .slice(0, 10),
    [anchor, w],
  )

  return (
    <Page narrow={narrow} title="Eventos" back={href('/perfil')}>
      <section className="event">
        <div className="event-top">
          <span className="event-tag">
            HELL<b>160</b>
          </span>
          <span className="muted t-small">{HELL160.tagline}</span>
        </div>
        <p className="t-sub">
          {HELL160.startLong}, no {HELL160.base}
        </p>
        <p className="t-small muted">
          {HELL160.distanceKm.toLocaleString('pt-PT')} km e {fmtInt(HELL160.gainM)} m a subir, {HELL160.limitH} h de limite. Dados provisórios para 2027, do site da prova.
        </p>
        <div className="btnrow">
          <a className="btn sm" href={HELL160.site} target="_blank" rel="noreferrer">
            Site do HELL160
          </a>
          <a className="btn line sm" href={HELL160.live} target="_blank" rel="noreferrer">
            Live e Hell Wall
          </a>
        </div>
      </section>

      <section>
        <h2 className="section-t">Enquanto esperas pela passagem</h2>
        <p className="muted t-small">Escolhe a aldeia onde vais apoiar e quanto tempo tens. O tempo conta ida, volta e estadia, em linha reta corrigida.</p>
        <div className="chips wrap" role="group" aria-label="Aldeia">
          {COURSE_VILLAGES.map((cv) => (
            <button key={cv.name} className="chip" aria-pressed={cv.name === v} onClick={() => setV(cv.name)}>
              {cv.name}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Tempo" style={{ marginTop: 8 }}>
          {WINDOWS.map((m) => (
            <button key={m} aria-pressed={m === w} onClick={() => setW(m)}>
              {fmtMin(m)}
            </button>
          ))}
        </div>
        <div className="rows flush" style={{ marginTop: 8 }}>
          {plan.map(({ p, c, m }) => (
            <a key={p.id} className="row-btn" href={href('/', { p: p.id })}>
              <Glyph sub={p.sub} fam={p.fam} done={!!(m && game.done[m.id])} />
              <span>
                <span className="row-name">{p.name}</span>
                <span className="row-meta">
                  {SUB_LABEL[p.sub]}, {c.walk ? `${fmtMin(c.oneWay)} a pé` : `${fmtMin(c.oneWay)} de carro`}
                </span>
              </span>
              <span className="row-right">
                <span className="num">{fmtMin(c.total)}</span>
                {m && <span className="xp">+{missionXp(game, m.id)}</span>}
              </span>
            </a>
          ))}
          {!plan.length && <p className="empty">Com {fmtMin(w)} não dá para sair de {v}. Escolhe mais tempo.</p>}
        </div>
      </section>
    </Page>
  )
}
