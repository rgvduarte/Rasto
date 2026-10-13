// Casca da app: um só mapa por baixo de tudo, os ecrãs por cima, a barra de separadores em baixo (ou à esquerda no ecrã largo).
import { lazy, Suspense, useEffect, useRef } from 'react'
import { useRoute, go } from './lib/router'
import { useGame } from './lib/store'
import { recorder } from './lib/recorder'
import { useNarrow } from './lib/ui'
import { MapStage } from './map/MapStage'
import { TabBar, Toast } from './ui/bits'
import { Explore } from './screens/Explore'
import { MissionsScreen } from './screens/MissionsScreen'
import { Record } from './screens/Record'
import { Activity } from './screens/Activity'
import { Profile } from './screens/Profile'
import { About } from './screens/About'
import { Events } from './screens/Events'
import { Onboarding } from './screens/Onboarding'
import { Celebrate } from './screens/Celebrate'
import { ArView } from './screens/ArView'

const Poster = lazy(() => import('./pages/Poster').then((m) => ({ default: m.Poster })))

const TITLES: Record<string, string> = {
  '/': 'Rasto Serpa',
  '/missoes': 'Missões, Rasto Serpa',
  '/gravar': 'Gravar, Rasto Serpa',
  '/atividade': 'Atividade, Rasto Serpa',
  '/perfil': 'Perfil, Rasto Serpa',
  '/sobre': 'Sobre o Rasto',
  '/eventos': 'Eventos, Rasto Serpa',
  '/cartaz': 'Cartaz do Rasto Serpa',
}

export function App() {
  const route = useRoute()
  const narrow = useNarrow()
  const game = useGame()
  const path = route.path
  const prev = useRef(path)

  useEffect(() => {
    // endereços da versão anterior
    if (path === '/mapa') go('/', Object.fromEntries(route.params.entries()), true)
    if (path === '/prova' || path === '/hell160') go('/eventos', undefined, true)
    // o cartaz usa outra folha de estilos: ao sair dele, recarrega
    if (prev.current === '/cartaz' && path !== '/cartaz') location.reload()
    prev.current = path
    document.title = TITLES[path] ?? 'Rasto Serpa'
  }, [path, route.params])

  // se a localização já foi autorizada antes, o jogador aparece logo no mapa
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') recorder.watch()
      })
      .catch(() => {})
  }, [])

  if (path === '/cartaz')
    return (
      <Suspense fallback={null}>
        <Poster route={route} />
      </Suspense>
    )

  let screen
  switch (path) {
    case '/missoes':
      screen = <MissionsScreen narrow={narrow} />
      break
    case '/gravar':
      screen = <Record narrow={narrow} />
      break
    case '/atividade':
      screen = <Activity route={route} narrow={narrow} />
      break
    case '/perfil':
      screen = <Profile narrow={narrow} />
      break
    case '/sobre':
      screen = <About narrow={narrow} />
      break
    case '/eventos':
      screen = <Events narrow={narrow} />
      break
    default:
      screen = <Explore route={route} narrow={narrow} />
  }

  return (
    <div className={`shell ${narrow ? 'narrow' : 'wide'}`}>
      <a className="skip" href="#conteudo" onClick={(e) => {
        e.preventDefault()
        document.getElementById('conteudo')?.focus()
      }}>
        Saltar para o conteúdo
      </a>
      <MapStage />
      <main id="conteudo" tabIndex={-1} className="screens">
        {screen}
      </main>
      <TabBar path={path} />
      <Celebrate />
      <ArView />
      <Toast />
      {/* quem abre uma ligação partilhada para um lugar vê o lugar; a entrada fica para a próxima vez */}
      {!game.onboarded && path === '/' && !route.params.get('p') && <Onboarding />}
    </div>
  )
}
