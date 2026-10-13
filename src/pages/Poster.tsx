import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import type { Map as MLMap, GeoJSONSourceSpecification } from 'maplibre-gl'
import { TerritoryMap } from '../components/TerritoryMap'
import { POIS } from '../data/catalog'
import { MISSIONS, COLLECTIONS } from '../data/missions'
import { siteBase, C } from '../map/style'
import { loadHexGrid, cellsAlong, cellsInside, cellPolygon } from '../lib/hex'
import { loadSim } from '../lib/sim'
import type { Route } from '../lib/router'
import '../styles/tokens.css'
import '../styles/poster.css'

// Cartaz 1536 × 1024 (3:2), o formato dos conceitos iniciais. Tudo o que aparece é real:
// o mapa (dados abertos), as capturas (a app a funcionar no telemóvel), os números (calculados).
const W = 1536
const H = 1024
const fmt = (n: number) => n.toLocaleString('pt-PT')

export function Poster({ route }: { route: Route }) {
  const print = route.params.has('print')
  const [scale, setScale] = useState(1)
  const none = useMemo(() => new Set<string>(), [])
  const base = siteBase()
  const [qr, setQr] = useState('')
  const [loop, setLoop] = useState<{ km: number; cells: number } | null>(null)

  useEffect(() => {
    if (print) return
    const fit = () => setScale(Math.min(1, (window.innerWidth - 32) / W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [print])

  useEffect(() => {
    QRCode.toString('https://rgvduarte.github.io/Rasto/', { type: 'svg', margin: 0, color: { dark: '#000000', light: '#00000000' } }).then(setQr)
  }, [])

  // a volta a Serpa por fora, em hexágonos: os do caminho e os de dentro do circuito
  const onInset = async (map: MLMap) => {
    const [g, sim] = await Promise.all([loadHexGrid(), loadSim()])
    const r = sim.routes.find((x) => x.id === 'volta-serpa')
    if (!r) return
    const got = new Set<number>()
    for (let i = 1; i < r.pts.length; i++) for (const c of cellsAlong(g, [r.pts[i - 1][0], r.pts[i - 1][1]], [r.pts[i][0], r.pts[i][1]])) got.add(c)
    for (const c of cellsInside(g, r.pts.map((p) => [p[0], p[1]] as [number, number]))) got.add(c)
    const near: number[] = []
    const [x0, y0, x1, y1] = [-7.625, 37.925, -7.570, 37.968]
    for (let i = 0; i < g.count; i++) {
      const ring = cellPolygon(g, i)
      const [lon, lat] = ring[0]
      if (lon > x0 && lon < x1 && lat > y0 && lat < y1) near.push(i)
    }
    const fc = (ids: number[]): GeoJSONSourceSpecification['data'] => ({
      type: 'FeatureCollection',
      features: ids.map((i) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [cellPolygon(g, i)] } })),
    })
    map.addSource('grid', { type: 'geojson', data: fc(near) })
    map.addSource('got', { type: 'geojson', data: fc([...got]) })
    map.addSource('run', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.pts.map((p) => [p[0], p[1]]) } } })
    const end = r.pts[r.pts.length - 1]
    map.addSource('me', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [end[0], end[1]] } } })
    map.addLayer({ id: 'grid-fill', type: 'fill', source: 'grid', paint: { 'fill-color': '#f4f5f7', 'fill-opacity': 0.55 } })
    map.addLayer({ id: 'got-fill', type: 'fill', source: 'got', paint: { 'fill-color': C.ocre, 'fill-opacity': 0.42 } })
    map.addLayer({ id: 'grid-line', type: 'line', source: 'grid', paint: { 'line-color': '#9aa2ad', 'line-width': 0.6, 'line-opacity': 0.6 } })
    map.addLayer({ id: 'got-line', type: 'line', source: 'got', paint: { 'line-color': C.ocreTinta, 'line-width': 0.9, 'line-opacity': 0.7 } })
    map.addLayer({ id: 'run-case', type: 'line', source: 'run', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': 6 } })
    map.addLayer({ id: 'run', type: 'line', source: 'run', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': C.anil, 'line-width': 3.2 } })
    map.addLayer({ id: 'me', type: 'circle', source: 'me', paint: { 'circle-radius': 8, 'circle-color': '#000', 'circle-stroke-color': C.anil, 'circle-stroke-width': 3.5 } })
    setLoop({ km: r.km, cells: got.size })
  }

  return (
    <div className={`poster-stage${print ? ' print' : ''}`} style={print ? undefined : { height: H * scale + 32 }}>
      <div className="poster" style={{ width: W, height: H, transform: print ? undefined : `scale(${scale})` }}>
        <header className="pt-head">
          <div className="pt-brand">
            <img src={`${base}icons/icon.svg`} alt="" width={36} height={36} />
            <span>
              Rasto <small>Serpa</small>
            </span>
          </div>
          <p className="pt-where">Concelho de Serpa, Beja, na margem esquerda do Guadiana</p>
        </header>

        <section className="pt-left">
          <h1>O território é o jogo.</h1>
          <p className="pt-lede">
            Para quem chega a Serpa e quer conhecer o concelho a sério: o que ver, onde comer e ficar, com as classificações do TripAdvisor, e um gravador para andar,
            correr ou pedalar. Por cima, um jogo.
          </p>
          <ul className="pt-how">
            <li>
              <b>És uma personagem no mapa.</b> O andarilho, a queijeira, o cantador, o moleiro: cada um ganha mais numa coleção.
            </li>
            <li>
              <b>O território fica teu.</b> {fmt(18802)} hexágonos de 150 m. Cada um por onde passas é conquistado; fecha um circuito e ganhas os de dentro.
            </li>
            <li>
              <b>Missões nos lugares reais.</b> {MISSIONS.length}, do castelo às azenhas do Guadiana, das tascas às queijarias, em {COLLECTIONS.length} coleções com
              selos.
            </li>
            <li>
              <b>Realidade aumentada.</b> Com o roteiro da Câmara Municipal de Serpa, a câmara aponta à torre do castelo destruída em 1707 e à antiga estação de Pias.
            </li>
          </ul>
        </section>

        <section className="pt-map">
          <TerritoryMap
            pois={POIS}
            done={none}
            interactive={false}
            variant="overview"
            scale
            printable
            bounds={[
              [-7.705, 37.735],
              [-7.235, 38.185],
            ]}
            label="Mapa do concelho de Serpa"
          />
          <div className="pt-legend">
            <span className="li">
              <span className="sw" style={{ background: C.ver }} />
              Ver
            </span>
            <span className="li">
              <span className="sw" style={{ background: C.provar }} />
              Provar
            </span>
            <span className="li">
              <span className="sw" style={{ background: C.ficar }} />
              Ficar
            </span>
            <span className="li">
              <span className="ln" />
              Estradões
            </span>
          </div>
        </section>

        <section className="pt-right">
          <div className="pt-phones">
            <figure>
              <div className="phone">
                <img src={`${base}cartaz/v2-explorar.webp`} alt="A app: ficha do Castelo de Serpa com a classificação do TripAdvisor e a missão" />
              </div>
              <figcaption>Cada lugar com a classificação, as direções e a missão</figcaption>
            </figure>
            <figure>
              <div className="phone">
                <img src={`${base}cartaz/v2-gravar.webp`} alt="A app a gravar uma corrida: hexágonos conquistados e um circuito fechado" />
              </div>
              <figcaption>A gravar: o território conquista-se à passagem</figcaption>
            </figure>
            <figure>
              <div className="phone">
                <img src={`${base}cartaz/v2-captura.webp`} alt="A app: missão Subir ao castelo cumprida, mais 40 XP" />
              </div>
              <figcaption>Chegas ao castelo e a missão fica feita</figcaption>
            </figure>
          </div>
          <figure className="pt-inset">
            <div className="pt-inset-map">
              <TerritoryMap
                pois={[]}
                done={none}
                interactive={false}
                variant="overview"
                printable
                bounds={[
                  [-7.6115, 37.9325],
                  [-7.5845, 37.9595],
                ]}
                label="Serpa: uma volta a correr em hexágonos"
                onReady={onInset}
              />
            </div>
            <figcaption>
              <b>Uma volta a Serpa por fora</b>
              {loop ? `${fmt(loop.km)} km por ruas e caminhos reais: ${loop.cells} hexágonos, contando os de dentro do circuito.` : 'por ruas e caminhos reais.'}
            </figcaption>
          </figure>
        </section>

        <footer className="pt-band">
          <div className="pt-facts">
            <div>
              <b>{fmt(1105.5)} km²</b>
              <span>de concelho</span>
            </div>
            <div>
              <b>{fmt(18802)}</b>
              <span>hexágonos por conquistar</span>
            </div>
            <div>
              <b>{POIS.length}</b>
              <span>lugares com posição verificada</span>
            </div>
            <div>
              <b>{fmt(1357)} km</b>
              <span>de estradões de terra</span>
            </div>
          </div>
          <div className="pt-qr">
            <div className="qr" aria-label="Código QR para rgvduarte.github.io/Rasto" dangerouslySetInnerHTML={{ __html: qr }} />
            <p>
              <b>rgvduarte.github.io/Rasto</b>
              <span>Abre no telemóvel e instala. Funciona sem rede nos estradões.</span>
            </p>
          </div>
          <p className="pt-src">
            Dados: CAOP 2020 (DGT), OpenStreetMap via Overture Maps, Copernicus DEM GLO-30, ESA WorldCover 2021, TripAdvisor (outubro de 2026). Capturas da app real.
          </p>
        </footer>
      </div>
    </div>
  )
}
