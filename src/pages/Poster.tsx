import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { TerritoryMap } from '../components/TerritoryMap'
import { Logo } from '../components/Logo'
import { POIS } from '../data/catalog'
import { MISSIONS, COLLECTIONS } from '../data/missions'
import { siteBase } from '../map/style'
import type { Route } from '../lib/router'
import '../styles/global.css'
import '../styles/poster.css'

// Cartaz 1536 × 1024 (3:2), o mesmo formato dos conceitos iniciais.
// Tudo o que aparece é real: o mapa (dados abertos), as capturas (a app a funcionar), os números (calculados).
const W = 1536
const H = 1024

export function Poster({ route }: { route: Route }) {
  const print = route.params.has('print')
  const [scale, setScale] = useState(1)
  const none = useMemo(() => new Set<string>(), [])
  const base = siteBase()

  useEffect(() => {
    if (print) return
    const fit = () => setScale(Math.min(1, (window.innerWidth - 32) / W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [print])

  const byFam = (f: string) => POIS.filter((p) => p.fam === f).length
  const [qr, setQr] = useState('')
  useEffect(() => {
    QRCode.toString('https://rgvduarte.github.io/Rasto/', { type: 'svg', margin: 0, color: { dark: '#15130f', light: '#00000000' } }).then(setQr)
  }, [])

  return (
    <div className={`poster-stage${print ? ' print' : ''}`} style={print ? undefined : { height: H * scale + 32 }}>
      <div className="poster" style={{ width: W, height: H, transform: print ? undefined : `scale(${scale})` }}>
        <header className="pt-head">
          <div className="pt-brand">
            <Logo size={34} />
            <span>
              Rasto <small>Serpa</small>
            </span>
          </div>
          <p className="pt-where">Concelho de Serpa · Beja · margem esquerda do Guadiana</p>
        </header>

        <section className="pt-left">
          <h1>O território é o jogo.</h1>
          <p className="pt-lede">
            Missões em lugares reais do concelho, para quem acompanha os atletas e para quem visita. Vais ao sítio, ganhas pontos, o
            mapa abre.
          </p>
          <ol className="pt-who">
            <li>
              <b>És uma personagem no mapa</b>
              <span>Escolhes quem és, andas pelo território real e a névoa levanta à tua passagem.</span>
            </li>
            <li>
              <b>Quem visita</b>
              <span>Património, mesa, produtores, Guadiana. Com distâncias reais e a lista do TripAdvisor.</span>
            </li>
            <li>
              <b>Município e parceiros</b>
              <span>Cada código validado num restaurante ou produtor é uma visita contada.</span>
            </li>
          </ol>
          <div className="pt-how">
            <p className="pt-k">Como se joga</p>
            <p>
              <b>Vai lá.</b> A localização confirma a visita; nos parceiros, o código é dado ao balcão. <b>Ganha XP.</b> Três missões
              numa freguesia e ela fica explorada. <b>Fecha coleções</b> e recebe o selo.
            </p>
          </div>
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
            <span className="li"><span className="sw" style={{ background: '#0f7a5a' }} />Ver · {byFam('ver')}</span>
            <span className="li"><span className="sw" style={{ background: '#c2410c' }} />Provar · {byFam('provar')}</span>
            <span className="li"><span className="sw" style={{ background: '#a2358c' }} />Ficar · {byFam('ficar')}</span>
            <span className="li"><span className="ln" />Estradões de terra</span>
          </div>
        </section>

        <section className="pt-right">
          <div className="pt-phones">
            <figure>
              <div className="phone">
                <img src={`${base}cartaz/app-mapa.webp`} alt="A app: ficha da Queijaria Guilherme com a missão" />
              </div>
              <figcaption>Um lugar, a sua missão e o que há perto</figcaption>
            </figure>
            <figure>
              <div className="phone">
                <img src={`${base}cartaz/app-missoes.webp`} alt="A app: XP, freguesias exploradas e selos" />
              </div>
              <figcaption>XP, freguesias exploradas e selos</figcaption>
            </figure>
          </div>
          <div className="pt-qr">
            <div className="qr" aria-label="Código QR para rgvduarte.github.io/Rasto" dangerouslySetInnerHTML={{ __html: qr }} />
            <p>
              <b>Abre no telemóvel.</b> Funciona no browser, sem instalar nada.
            </p>
          </div>
          <div className="pt-colls">
            <p className="pt-k">
              {MISSIONS.length} missões em {COLLECTIONS.length} coleções
            </p>
            <ul>
              {COLLECTIONS.map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <span className="n">{MISSIONS.filter((m) => m.collection === c.id).length}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="pt-foot">
          <div className="pt-facts">
            <div>
              <b>1105,5 km²</b>
              <span>de concelho</span>
            </div>
            <div>
              <b>1357 km</b>
              <span>de estradões de terra</span>
            </div>
            <div>
              <b>5–519 m</b>
              <span>do Guadiana à serra de Ficalho</span>
            </div>
            <div>
              <b>{POIS.length} lugares</b>
              <span>com posição verificada</span>
            </div>
          </div>
          <div className="pt-hell">
            <p>
              <b>Realidade aumentada.</b> Os pontos do roteiro da Câmara de Serpa entram no jogo: apontas o telemóvel à torre do castelo
              destruída em 1707, ou à antiga estação de Pias, e vês como era.
            </p>
          </div>
          <div className="pt-url">
            <b>rgvduarte.github.io/Rasto</b>
            <span>
              Dados: CAOP 2020 (DGT) · OpenStreetMap via Overture Maps · Copernicus DEM · ESA WorldCover 2021 · TripAdvisor, out 2026
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
