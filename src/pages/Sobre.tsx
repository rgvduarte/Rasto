import { POIS } from '../data/catalog'
import { MISSIONS } from '../data/missions'
import { HELL160 } from '../data/hell160'
import { fmtInt } from '../lib/geo'
import { href } from '../lib/router'
import { siteBase } from '../map/style'

const SOURCES = [
  ['Limites do concelho e das freguesias', 'CAOP 2020, Direção-Geral do Território', 'Dados abertos DGT'],
  ['Estradas, estradões, caminhos, água, edifícios, património', 'OpenStreetMap, via Overture Maps (release 2026-09-23.1)', 'ODbL · © contribuidores do OpenStreetMap'],
  ['Restaurantes, alojamentos e lugares', 'Overture Maps Places', 'CDLA Permissive 2.0'],
  ['Relevo e curvas de nível', 'Copernicus DEM GLO-30', '© DLR e.V. 2010-2014 e © Airbus Defence and Space GmbH 2014-2018, Copernicus/ESA'],
  ['Ocupação do solo', 'ESA WorldCover 2021 v200, 10 m', 'CC BY 4.0 · © ESA WorldCover project'],
  ['Lista de atrações e restaurantes', 'TripAdvisor, Serpa (g189109), recolha de 13 out 2026', 'Nomes e classificações citados com ligação'],
  ['Dados da prova', 'Site do HELL160 (rgvduarte/hell160)', 'Provisórios para 2027'],
]

export function Sobre() {
  const withTa = POIS.filter((p) => p.ta).length
  return (
    <>
      <section className="sec tight">
        <div className="wrap split">
          <div className="stack">
            <p className="eyebrow">Sobre o Rasto</p>
            <h1 className="h2">Uma plataforma para municípios, a começar por Serpa.</h1>
          </div>
          <div className="stack">
            <p className="lede">
              O Rasto junta mapa, missões e recomendações para quem visita um concelho. Serpa é o primeiro território; o HELL160 é o primeiro
              evento ligado.
            </p>
            <p className="muted">
              Segue o que ficou decidido na reunião de 13 de outubro de 2026: o jogo é para os acompanhantes e para os visitantes, não para os
              atletas em prova; o evento é o motivo da visita; tudo assenta numa só plataforma com páginas próprias para cada vertente; o
              alojamento “Dormir na aldeia” e o live tracking vivem no site do HELL160.
            </p>
          </div>
        </div>
      </section>

      <section className="sec band">
        <div className="wrap stack-l">
          <h2 className="h3">O que é real e o que ainda não é</h2>
          <div className="grid3">
            <div className="card stack">
              <span className="tag done">Real</span>
              <p>
                O mapa inteiro: limites, relevo, água, {fmtInt(1357)} km de estradões, edifícios. As posições dos {fmtInt(POIS.length)} lugares,
                tiradas do OpenStreetMap e do Overture, nunca à mão. {withTa ? `${withTa} lugares com a classificação do TripAdvisor.` : ''}
              </p>
            </div>
            <div className="card stack">
              <span className="tag done">Real</span>
              <p>
                A validação por GPS das {fmtInt(MISSIONS.filter((m) => m.check === 'gps').length)} missões de visita: só contam a menos de 60 a
                300 m do ponto, conforme o lugar.
              </p>
            </div>
            <div className="card stack">
              <span className="tag sim">Ainda não</span>
              <p>
                Códigos dos parceiros (nenhum restaurante ou produtor aderiu ainda), contas, equipas partilhadas e ranking entre equipas
                (precisam de servidor). O traçado do HELL160 (o GPX de 2027 não foi publicado).
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap stack-l">
          <h2 className="h3">Próximos passos</h2>
          <ol className="steps">
            <li>
              <h3 className="h3">Parceiros</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                Adesão de restaurantes, produtores e alojamentos, com código diário gerado no back-office e contagem de visitas por parceiro.
              </p>
            </li>
            <li>
              <h3 className="h3">Conteúdos do município</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                Integrar o roteiro de realidade aumentada que a Câmara de Serpa tem desde 2018 (20 pontos) e os percursos pedestres oficiais
                (GR15, PR) quando houver os GPX.
              </p>
            </li>
            <li>
              <h3 className="h3">Recomendações e indicadores</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                Sugestões por perfil a partir da segunda visita, e indicadores por setor para o município (restauração, produtores,
                alojamento).
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap split">
          <div className="stack">
            <h2 className="h3">Cartaz</h2>
            <p className="muted">
              O cartaz do Rasto em Serpa, feito com o mapa e as capturas desta app. Formato 3:2, como os conceitos iniciais.
            </p>
          </div>
          <div className="row">
            <a className="btn" href={href('/cartaz')}>
              Ver o cartaz
            </a>
            <a className="btn ghost" href={`${siteBase()}cartaz/rasto-serpa-cartaz.png`} download>
              PNG · 3072 × 2048
            </a>
            <a className="btn ghost" href={`${siteBase()}cartaz/rasto-serpa-cartaz.pdf`} download>
              PDF · 300 dpi
            </a>
          </div>
        </div>
      </section>

      <section className="sec tight band">
        <div className="wrap stack-l">
          <h2 className="h3">Fontes e licenças</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>O quê</th>
                  <th>Fonte</th>
                  <th>Licença</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map(([a, b, c]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td>{b}</td>
                    <td className="muted">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">
            As tiles do mapa (vetoriais, relevo e ocupação do solo) e os glifos são gerados a partir destas fontes pelos scripts em
            <code> scripts/geo</code> e <code>scripts/tiles</code> do repositório, e servidos como ficheiros estáticos pelo GitHub Pages. O
            mapa serve para descobrir; para conduzir ou caminhar usa uma aplicação de navegação. Ligação ao evento:{' '}
            <a href={HELL160.site} target="_blank" rel="noreferrer">
              HELL160 ↗
            </a>
          </p>
        </div>
      </section>
    </>
  )
}
