import { useMemo } from 'react'
import { TerritoryMap } from '../components/TerritoryMap'
import { Glyph } from '../components/Glyph'
import { POIS } from '../data/catalog'
import { MISSIONS, COLLECTIONS } from '../data/missions'
import { HELL160 } from '../data/hell160'
import { href } from '../lib/router'
import { fmtInt } from '../lib/geo'
import { useGame, freguesiaProgress } from '../lib/store'

// Números do concelho, calculados a partir dos dados (scripts/geo): não são estimativas.
const FACTS = [
  { v: '1 105,5', u: 'km²', t: 'de concelho, entre o Guadiana e a fronteira com Espanha', s: 'CAOP 2020, DGT' },
  { v: '1 357', u: 'km', t: 'de estradões de terra mapeados', s: 'OpenStreetMap, out 2026' },
  { v: '5–519', u: 'm', t: 'de altitude, do leito do Guadiana à serra de Ficalho', s: 'Copernicus DEM GLO-30' },
  { v: '5', u: '', t: 'freguesias, cada uma para explorar no mapa', s: 'CAOP 2020, DGT' },
]

export function Home() {
  const game = useGame()
  const progress = useMemo(() => freguesiaProgress(game).map((f) => ({ name: f.name, p: f.p })), [game])
  const none = useMemo(() => new Set<string>(), [])
  const sample = ['castelo-serpa', 'aqueduto-serpa', 'pulo-do-lobo', 'queijaria-guilherme', 'molho-bico', 'casa-do-cante']
    .map((id) => POIS.find((p) => p.id === id)!)
    .filter(Boolean)

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="stack-l" style={{ paddingBottom: 8 }}>
            <p className="eyebrow">Rasto · concelho de Serpa · margem esquerda do Guadiana</p>
            <h1 className="display">O território é o jogo.</h1>
            <p className="lede">
              Missões em lugares reais do concelho de Serpa. Sobes ao castelo, almoças em Pias, compras queijo na queijaria: cada visita conta
              pontos e abre o mapa.
            </p>
            <div className="row">
              <a className="btn anil" href={href('/mapa')}>
                Abrir o mapa
              </a>
              <a className="btn ghost" href={href('/missoes')}>
                Ver as {MISSIONS.length} missões
              </a>
            </div>
          </div>
          <div className="hero-map">
            <TerritoryMap pois={POIS} done={none} interactive={false} progress={progress} label="Mapa do concelho de Serpa com os lugares do Rasto" />
            <p className="caption">
              {fmtInt(POIS.length)} lugares no concelho de Serpa. Relevo, água, caminhos e edifícios de dados abertos.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="facts">
            {FACTS.map((f) => (
              <div className="fact" key={f.t}>
                <b>
                  {f.v}
                  {f.u && <i>{f.u}</i>}
                </b>
                <span>{f.t}</span>
                <small>{f.s}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap split">
          <div className="stack">
            <p className="eyebrow">Como se joga</p>
            <h2 className="h2">Ir ao sítio é a única forma de ganhar.</h2>
            <p className="lede">Não há perguntas de algibeira nem pontos por abrir a app. Conta estar lá.</p>
          </div>
          <ol className="steps">
            <li>
              <h3 className="h3">Escolhe uma missão</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                No mapa ou na lista: um miradouro, uma adega, uma igreja de aldeia, um almoço.
              </p>
            </li>
            <li>
              <h3 className="h3">Vai lá</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                A localização do telemóvel confirma a visita. Nos restaurantes e produtores, o código é dado ao balcão.
              </p>
            </li>
            <li>
              <h3 className="h3">Abre o território</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                Três missões numa freguesia e ela fica explorada no teu mapa. Uma coleção completa dá selo e bónus.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec">
        <div className="wrap stack-l">
          <div className="split">
            <div className="stack">
              <p className="eyebrow">Para quem</p>
              <h2 className="h2">Os atletas correm. O jogo é de quem os acompanha.</h2>
            </div>
            <p className="lede">
              Cada atleta do HELL160 traz três ou quatro pessoas. Entre duas passagens há horas por preencher, e é aí que o território entra.
            </p>
          </div>
          <div className="grid3">
            <div className="card stack">
              <h3 className="h3">Família e equipa de apoio</h3>
              <p className="muted">Sabes em que aldeia vais esperar. O Rasto mostra o que há a menos de dez minutos e quanto tempo leva.</p>
              <a href={href('/prova')}>Planear o apoio no HELL160 →</a>
            </div>
            <div className="card stack">
              <h3 className="h3">Quem vem passar o fim de semana</h3>
              <p className="muted">O que ver, onde comer, quem faz o queijo e o vinho, onde dormir. Com as distâncias reais entre aldeias.</p>
              <a href={href('/mapa')}>Abrir o mapa →</a>
            </div>
            <div className="card stack">
              <h3 className="h3">Município e parceiros</h3>
              <p className="muted">
                Restaurantes, produtores e alojamentos entram como parceiros. Cada código validado é uma visita que se pode contar.
              </p>
              <a href={href('/sobre')}>Como funciona para parceiros →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap stack-l">
          <div className="split">
            <div className="stack">
              <p className="eyebrow">{COLLECTIONS.length} coleções</p>
              <h2 className="h2">Do castelo ao Pulo do Lobo.</h2>
            </div>
            <ul className="plan">
              {sample.map((p) => {
                const m = MISSIONS.find((x) => x.poi === p.id)
                return (
                  <li key={p.id}>
                    <Glyph sub={p.sub} fam={p.fam} />
                    <span>
                      <span className="t">{m?.title ?? p.name}</span>
                      <span className="small muted" style={{ display: 'block' }}>
                        {p.name} · {p.place}
                      </span>
                    </span>
                    {m && <span className="tag xp">+{m.xp} XP</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap split">
          <div className="stack">
            <p className="eyebrow" style={{ color: '#b6ad9f' }}>
              <span className="tag hell">
                HELL<b>160</b>
              </span>{' '}
              {HELL160.start} · provisório
            </p>
            <h2 className="h2">O live e o Hell Wall estão no HELL160.</h2>
            <p className="lede" style={{ color: '#d9d2c5' }}>
              O Rasto não repete o seguimento dos atletas. Junta-lhe o resto: as aldeias por onde a prova passa e o que fazer em cada uma
              enquanto esperas.
            </p>
          </div>
          <div className="stack" style={{ alignSelf: 'end' }}>
            <div className="row">
              <a className="btn" style={{ ['--b' as string]: '#c8361b' }} href={HELL160.live} target="_blank" rel="noreferrer">
                Abrir o live do HELL160 <span className="ext">↗</span>
              </a>
              <a className="btn ghost" style={{ color: '#f3efe6', borderColor: '#f3efe6' }} href={href('/prova')}>
                Planear o apoio
              </a>
            </div>
            <p className="small muted">
              {HELL160.distanceKm.toLocaleString('pt-PT')} km · {fmtInt(HELL160.gainM)} m D+ · {HELL160.limitH} h · partida em {HELL160.base}.
              Dados do site do HELL160, provisórios para 2027.
            </p>
          </div>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap split">
          <div className="stack">
            <p className="eyebrow">Dados</p>
            <h3 className="h3">Um mapa feito de dados abertos, servido pelo próprio site.</h3>
          </div>
          <p className="muted">
            Limites da CAOP 2020 (DGT), estradas, caminhos, água e edifícios do OpenStreetMap via Overture Maps, relevo do Copernicus DEM e
            ocupação do solo da ESA WorldCover. Os restaurantes e as atrações seguem a lista do TripAdvisor para Serpa, com as posições
            confirmadas no OpenStreetMap. Sem Google Maps e sem chave de API. <a href={href('/sobre')}>Fontes, licenças e método</a>.
          </p>
        </div>
      </section>
    </>
  )
}
