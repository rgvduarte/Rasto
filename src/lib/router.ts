// Rotas por hash (#/mapa, #/missoes?...): funcionam no GitHub Pages sem 404 nem configuração de servidor.
import { useEffect, useState } from 'react'

export type Route = { path: string; params: URLSearchParams }

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function href(path: string, params?: Record<string, string | undefined>) {
  const q = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
        .join('&')
    : ''
  return `#${path}${q ? `?${q}` : ''}`
}

export function go(path: string, params?: Record<string, string | undefined>, replace = false) {
  const h = href(path, params)
  if (replace) window.history.replaceState(null, '', h)
  else window.location.hash = h
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'))
}
