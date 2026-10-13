import { useEffect, useState } from 'react'
import { useRoute, href } from './lib/router'
import { useGame, xpOf } from './lib/store'
import { fmtInt } from './lib/geo'
import { Logo } from './components/Logo'
import { Home } from './pages/Home'
import { MapPage } from './pages/MapPage'
import { Missions } from './pages/Missions'
import { Prova } from './pages/Prova'
import { Sobre } from './pages/Sobre'
import { Poster } from './pages/Poster'

const NAV = [
  { path: '/mapa', label: 'Mapa' },
  { path: '/missoes', label: 'Missões' },
  { path: '/prova', label: 'HELL160' },
  { path: '/sobre', label: 'Sobre e dados' },
]

const TITLES: Record<string, string> = {
  '/': 'Rasto · Serpa',
  '/mapa': 'Mapa · Rasto Serpa',
  '/missoes': 'Missões · Rasto Serpa',
  '/prova': 'Durante o HELL160 · Rasto Serpa',
  '/sobre': 'Sobre e dados · Rasto Serpa',
  '/cartaz': 'Cartaz · Rasto Serpa',
}

export function App() {
  const route = useRoute()
  const game = useGame()
  const xp = xpOf(game).total
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
    document.title = TITLES[route.path] ?? 'Rasto · Serpa'
    if (route.path !== '/mapa') window.scrollTo(0, 0)
  }, [route.path])

  // o cartaz é uma página sozinha, sem cabeçalho nem rodapé
  if (route.path === '/cartaz') return <Poster route={route} />

  let page
  switch (route.path) {
    case '/mapa':
      page = <MapPage route={route} />
      break
    case '/missoes':
      page = <Missions />
      break
    case '/prova':
      page = <Prova route={route} />
      break
    case '/sobre':
      page = <Sobre />
      break
    default:
      page = <Home />
  }

  return (
    <>
      <a className="skip" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <header className="top">
        <div className="wrap">
          <a className="brand" href={href('/')}>
            <Logo />
            <span>
              Rasto <small>Serpa</small>
            </span>
          </a>
          <nav className={`nav${open ? ' open' : ''}`} aria-label="Principal">
            {NAV.map((n) => (
              <a key={n.path} href={href(n.path)} aria-current={route.path === n.path ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <button className="menu-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
            Menu
          </button>
          <a className="xp-pill" href={href('/missoes')} aria-label={`${fmtInt(xp)} XP. Ver as missões`}>
            {fmtInt(xp)} <span>XP</span>
          </a>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1}>
        {page}
      </main>
      {route.path !== '/mapa' && (
        <footer className="foot">
          <div className="wrap">
            <p>
              Rasto · protótipo, outubro de 2026. O progresso fica guardado neste browser; ainda não há contas nem servidor.
            </p>
            <p>
              Mapa: © OpenStreetMap (via Overture Maps), CAOP 2020 © DGT, Copernicus DEM, ESA WorldCover 2021.{' '}
              <a href={href('/sobre')}>Fontes e licenças</a>
            </p>
          </div>
        </footer>
      )}
    </>
  )
}
