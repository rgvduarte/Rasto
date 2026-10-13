// Sobre: o que é o Rasto, para quem, o que já é real e o que ainda não é, e as fontes de tudo o que aparece no mapa.
import { Page } from './Page'
import { POIS } from '../data/catalog'
import { MISSIONS, COLLECTIONS } from '../data/missions'
import { AR_SPOTS } from '../data/ar'
import { fmtInt } from '../lib/geo'
import { href } from '../lib/router'
import { siteBase } from '../map/style'

const SOURCES: [string, string, string][] = [
  ['Limites do concelho e das freguesias', 'CAOP 2020, Direção-Geral do Território', 'Dados abertos DGT'],
  ['Ruas, estradões, caminhos, água, edifícios, linha de comboio', 'OpenStreetMap, via Overture Maps (2026-09-23.1)', 'ODbL, © contribuidores do OpenStreetMap'],
  ['Restaurantes, alojamentos e lugares', 'Overture Maps Places', 'CDLA Permissive 2.0'],
  ['Relevo, curvas de nível e altitude das atividades', 'Copernicus DEM GLO-30', '© DLR e.V. 2010-2014 e © Airbus Defence and Space GmbH 2014-2018, Copernicus/ESA'],
  ['Ocupação do solo', 'ESA WorldCover 2021 v200, 10 m', 'CC BY 4.0, © ESA WorldCover project'],
  ['Classificações de atrações e restaurantes', 'TripAdvisor, Serpa (g189109), recolha de 13 out 2026', 'Citadas com ligação para a página de cada lugar'],
  ['Pontos de realidade aumentada', 'Roteiro da Câmara Municipal de Serpa', 'Por integrar'],
]

export function About({ narrow }: { narrow: boolean }) {
  const withTa = POIS.filter((p) => p.ta).length
  return (
    <Page narrow={narrow} title="Sobre o Rasto" back={href('/perfil')}>
      <section className="prose">
        <p className="lede">
          Para quem chega a Serpa, numa casa da aldeia ou no hotel, e quer conhecer o concelho a sério: onde comer, o que ver, por onde andar. E para quem já cá vive e
          quer voltar a olhar para ele.
        </p>
        <p>
          O Rasto junta três coisas que já tens no telemóvel: um mapa para encontrar lugares, as classificações do TripAdvisor para escolher, e um gravador para
          caminhar, correr ou pedalar. Por cima, um jogo: o concelho está dividido em {fmtInt(18802)} hexágonos de 150 m e cada um por onde passas fica teu. Nos
          lugares há {MISSIONS.length} missões em {COLLECTIONS.length} coleções, com selos e níveis.
        </p>
      </section>

      <section className="prose">
        <h2 className="section-t">Para os municípios</h2>
        <p>
          Serpa é o primeiro território. A plataforma serve outro concelho: muda o mapa, os lugares e as missões; a app, o jogo e as regras ficam. O município fica com
          uma forma de levar as pessoas aos sítios, das aldeias aos produtores, e com números por setor quando houver servidor.
        </p>
      </section>

      <section className="prose">
        <h2 className="section-t">Realidade aumentada</h2>
        <p>
          A Câmara Municipal de Serpa tem um roteiro de realidade aumentada com cerca de 20 pontos. O Rasto já sabe onde estão os primeiros e para onde apontar a
          câmara; as animações entram quando forem integradas.
        </p>
        <ul className="bul">
          {AR_SPOTS.map((s) => (
            <li key={s.poi}>
              <b>{s.title}.</b> {s.shows}
            </li>
          ))}
        </ul>
      </section>

      <section className="prose">
        <h2 className="section-t">O que é real e o que ainda não é</h2>
        <ul className="bul">
          <li>
            <b>Real:</b> o mapa inteiro (limites, relevo, água, {fmtInt(1357)} km de estradões, edifícios), servido pelo próprio site, sem chave de API. As posições dos{' '}
            {fmtInt(POIS.length)} lugares, tiradas do OpenStreetMap e do Overture, nunca à mão. {withTa} lugares com a classificação do TripAdvisor.
          </li>
          <li>
            <b>Real:</b> a gravação por GPS, a altitude pelo relevo do Copernicus, os hexágonos conquistados, os circuitos fechados, os segmentos e a validação das
            missões de visita a menos de 60 a 300 m do lugar.
          </li>
          <li>
            <b>Simulado, e marcado como tal:</b> os percursos de demonstração, que seguem caminhos reais do OpenStreetMap a 8 vezes a velocidade, para experimentar
            longe de Serpa.
          </li>
          <li>
            <b>Ainda não:</b> os códigos dos parceiros (nenhum restaurante ou produtor aderiu), as contas, as equipas e os rankings entre jogadores (precisam de
            servidor), e as animações de realidade aumentada.
          </li>
        </ul>
      </section>

      <section className="prose">
        <h2 className="section-t">Privacidade</h2>
        <p>O progresso, as atividades e as avaliações ficam neste telemóvel. A localização é usada no aparelho e não é enviada para lado nenhum.</p>
      </section>

      <section>
        <h2 className="section-t">Fontes e licenças</h2>
        <div className="table-wrap">
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
        <p className="note">
          As tiles e os glifos são gerados a partir destas fontes pelos scripts em scripts/geo e scripts/tiles do repositório e servidos como ficheiros estáticos. O
          mapa serve para descobrir; para conduzir usa uma aplicação de navegação.
        </p>
      </section>

      <section>
        <h2 className="section-t">Cartaz</h2>
        <div className="btnrow">
          <a className="btn line sm" href={href('/cartaz')}>
            Ver o cartaz
          </a>
          <a className="btn soft sm" href={`${siteBase()}cartaz/rasto-serpa-cartaz.pdf`} download>
            PDF para imprimir
          </a>
        </div>
      </section>
    </Page>
  )
}
