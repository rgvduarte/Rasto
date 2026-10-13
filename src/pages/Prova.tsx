import { useMemo } from 'react'
import { Glyph } from '../components/Glyph'
import { HELL160, COURSE_VILLAGES } from '../data/hell160'
import { POIS, poiById, SUB_LABEL } from '../data/catalog'
import { missionByPoi } from '../data/missions'
import { useGame } from '../lib/store'
import { go, href, type Route } from '../lib/router'
import { km, fmtDist, walkMin, driveMin, fmtMin, fmtInt } from '../lib/geo'

const WINDOWS = [30, 60, 90, 120, 180]
const STAY: Record<string, number> = { restaurante: 60, petiscos: 40, pizzaria: 45, pastelaria: 15, museu: 40, queijo: 25, vinho: 40, loja: 15 }

// Quanto custa ir e voltar a um lugar a partir da aldeia onde se espera (estimativa em linha reta, ver lib/geo).
function cost(fromKm: number, sub: string) {
  const walk = fromKm <= 1.3
  const oneWay = walk ? walkMin(fromKm) : driveMin(fromKm)
  const stay = STAY[sub] ?? 15
  return { walk, total: oneWay * 2 + stay, oneWay, stay }
}

export function Prova({ route }: { route: Route }) {
  const game = useGame()
  const v = route.params.get('aldeia') ?? COURSE_VILLAGES[0].name
  const w = Number(route.params.get('min') ?? 60)
  const village = COURSE_VILLAGES.find((x) => x.name === v) ?? COURSE_VILLAGES[0]
  const anchor = poiById(village.poi)!

  const nearCounts = useMemo(
    () =>
      Object.fromEntries(
        COURSE_VILLAGES.map((cv) => {
          const a = poiById(cv.poi)!
          return [cv.name, POIS.filter((p) => p.fam !== 'ficar' && km(a, p) <= 2).length]
        }),
      ),
    [],
  )

  const plan = useMemo(
    () =>
      POIS.filter((p) => p.fam !== 'ficar')
        .map((p) => {
          const d = km(anchor, p)
          return { p, d, c: cost(d, p.sub), m: missionByPoi(p.id) }
        })
        .filter((x) => x.c.total <= w)
        .sort((a, b) => (b.m ? 1 : 0) - (a.m ? 1 : 0) || a.c.total - b.c.total)
        .slice(0, 12),
    [anchor, w],
  )

  const set = (k: string, val: string) => {
    const next: Record<string, string> = { aldeia: v, min: String(w) }
    next[k] = val
    go('/prova', next, true)
  }

  return (
    <>
      <section className="sec tight">
        <div className="wrap split">
          <div className="stack">
            <p className="eyebrow">
              <span className="tag hell">
                HELL<b>160</b>
              </span>{' '}
              {HELL160.tagline}
            </p>
            <h1 className="h2">Enquanto esperas pela passagem.</h1>
            <p className="lede">
              O live e o Hell Wall estão no site do HELL160. Aqui escolhes a aldeia onde vais apoiar e quanto tempo tens, e vês o que dá para
              fazer sem perder a passagem.
            </p>
            <div className="row">
              <a className="btn" style={{ ['--b' as string]: '#c8361b' }} href={HELL160.live} target="_blank" rel="noreferrer">
                Live do HELL160 <span className="ext">↗</span>
              </a>
              <a className="btn ghost" href={HELL160.stay} target="_blank" rel="noreferrer">
                Dormir na aldeia <span className="ext">↗</span>
              </a>
            </div>
          </div>
          <div className="card stack">
            <h2 className="h3">A prova</h2>
            <dl className="kv" style={{ marginTop: 0 }}>
              <dt>Partida</dt>
              <dd>
                {HELL160.start}, {HELL160.base}
              </dd>
              <dt>Distância</dt>
              <dd>
                {HELL160.distanceKm.toLocaleString('pt-PT')} km · {fmtInt(HELL160.gainM)} m D+
              </dd>
              <dt>Limite</dt>
              <dd>{HELL160.limitH} horas</dd>
              <dt>Apoio</dt>
              <dd>
                {HELL160.aid} abastecimentos, {HELL160.lifeBases} bases de vida
              </dd>
            </dl>
            <p className="small muted">
              Fonte: site do HELL160. Datas e traçado de 2027 ainda são provisórios; o GPX oficial não foi publicado, por isso aqui não se
              desenha o percurso.{' '}
              <a href={HELL160.race} target="_blank" rel="noreferrer">
                Regulamento e provas ↗
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="sec tight" style={{ paddingTop: 0 }}>
        <div className="wrap stack-l">
          <div className="stack">
            <h2 className="h3">1. Onde vais esperar</h2>
            <p className="muted small">Aldeias por onde a prova passa, segundo o site do HELL160. A ordem e as horas de passagem vêm do live.</p>
          </div>
          <div className="vgrid" role="group" aria-label="Aldeia">
            {COURSE_VILLAGES.map((cv) => (
              <button key={cv.name} className="village" aria-pressed={cv.name === village.name} onClick={() => set('aldeia', cv.name)}>
                <b>{cv.name}</b>
                <span className="small muted">{nearCounts[cv.name]} lugares para ver ou provar a menos de 2 km</span>
              </button>
            ))}
          </div>

          <div className="stack">
            <h2 className="h3">2. Quanto tempo tens</h2>
            <div className="chips" role="group" aria-label="Tempo disponível">
              {WINDOWS.map((m) => (
                <button key={m} className="chip" aria-pressed={m === w} onClick={() => set('min', String(m))}>
                  {fmtMin(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="stack">
            <h2 className="h3">
              3. Em {fmtMin(w)} a partir de {village.name}
            </h2>
            {plan.length ? (
              <ul className="plan">
                {plan.map(({ p, d, c, m }) => (
                  <li key={p.id}>
                    <Glyph sub={p.sub} fam={p.fam} done={!!(m && game.done[m.id])} />
                    <span>
                      <a className="t" href={href('/mapa', { p: p.id })}>
                        {p.name}
                      </a>
                      <span className="small muted" style={{ display: 'block' }}>
                        {SUB_LABEL[p.sub]} · {fmtDist(d)} · {c.walk ? `${fmtMin(c.oneWay)} a pé` : `${fmtMin(c.oneWay)} de carro`} para cada lado,{' '}
                        {fmtMin(c.stay)} no local
                      </span>
                    </span>
                    {m ? <span className="tag xp">+{m.xp}</span> : <span className="small muted num">{fmtMin(c.total)}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Com este tempo não dá para sair de {village.name}. Experimenta uma janela maior.</p>
            )}
            <p className="small muted">
              Tempos estimados a partir da distância em linha reta (×1,35 pelas curvas; 4,5 km/h a pé, 55 km/h de carro). Conta sempre com
              margem: os atletas podem chegar antes da hora prevista.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
