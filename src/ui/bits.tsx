// Peças pequenas da interface: barra de separadores, aviso, disco da personagem, perfil de altitude, miniatura do percurso.
import { useMemo } from 'react'
import { Icon, type IconName } from './Icon'
import { href } from '../lib/router'
import { useToast, fmtClock } from '../lib/ui'
import { useRecorder } from '../lib/recorder'
import { avatarById, AVATARS } from '../data/avatars'
import { GLYPH, FAMILY_COLOR } from '../map/icons'
import type { Family, Sub } from '../data/types'
import { fmtInt } from '../lib/geo'

const TABS: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Explorar', icon: 'explorar' },
  { path: '/missoes', label: 'Missões', icon: 'missoes' },
  { path: '/gravar', label: 'Gravar', icon: 'gravar' },
  { path: '/atividade', label: 'Atividade', icon: 'atividade' },
  { path: '/perfil', label: 'Perfil', icon: 'perfil' },
]

export function TabBar({ path }: { path: string }) {
  const rec = useRecorder()
  const live = rec.status === 'recording' || rec.status === 'paused'
  return (
    <nav className="tabbar" aria-label="Principal">
      <a className="tab-brand" href={href('/sobre')} aria-label="Rasto Serpa: sobre a app">
        <img src="./icons/icon.svg" alt="" width={44} height={44} />
      </a>
      {TABS.map((t) => {
        const on = t.path === '/' ? path === '/' : path.startsWith(t.path)
        if (t.icon === 'gravar')
          return (
            <a key={t.path} className={`tab rec${live ? ' live' : ''}`} href={href(t.path)} aria-current={on ? 'page' : undefined}>
              <span className="tab-rec">{live && rec.status === 'paused' ? <Icon name="pausa" size={24} stroke={2.6} /> : <Icon name="gravar" size={26} stroke={2.2} />}</span>
              <span className="num">{live ? fmtClock(rec.elapsed) : t.label}</span>
            </a>
          )
        return (
          <a key={t.path} className="tab" href={href(t.path)} aria-current={on ? 'page' : undefined}>
            <Icon name={t.icon} size={24} stroke={on ? 2.3 : 1.9} />
            <span>{t.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

export function Toast() {
  const t = useToast()
  return (
    <div aria-live="polite" className="toast-slot">
      {t && (
        <p className="toast" key={t.id}>
          {t.text}
        </p>
      )}
    </div>
  )
}

export function AvatarDisc({ kind, ring, size = 40 }: { kind?: string | null; ring?: string | null; size?: number }) {
  const a = avatarById(kind) ?? AVATARS[0]
  return (
    <span className="disc" style={{ width: size, height: size, borderWidth: Math.max(2.5, size / 14), ['--ring' as string]: ring ?? '#2348d1' }} aria-hidden="true">
      <svg viewBox="0 0 20 20" style={{ width: size * 0.48, height: size * 0.48 }}>
        <path d={a.glyph} fillRule="evenodd" />
      </svg>
    </span>
  )
}

export function Glyph({ sub, fam, done = false, size = 40 }: { sub: Sub; fam: Family; done?: boolean; size?: number }) {
  const c = FAMILY_COLOR[fam]
  return (
    <span className={`glyph${done ? ' done' : ''}`} style={{ background: c, color: c, width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill={done ? c : '#fff'} style={{ width: size * 0.52, height: size * 0.52 }}>
        <path d={done ? GLYPH.check : GLYPH[sub]} fillRule="evenodd" />
      </svg>
    </span>
  )
}

// perfil de altitude (distância × altitude), com a escala honesta: o eixo vertical não começa no zero, diz-se onde começa
export function ElevationChart({ profile, height = 120 }: { profile: [number, number][]; height?: number }) {
  const d = useMemo(() => {
    if (profile.length < 2) return null
    const W = 340
    const H = height
    const xs = profile.map((p) => p[0])
    const ys = profile.map((p) => p[1])
    const x1 = Math.max(...xs) || 1
    let y0 = Math.min(...ys)
    let y1 = Math.max(...ys)
    if (y1 - y0 < 20) {
      const m = (y0 + y1) / 2
      y0 = m - 10
      y1 = m + 10
    }
    const pad = 4
    const X = (v: number) => (v / x1) * W
    const Y = (v: number) => pad + (1 - (v - y0) / (y1 - y0)) * (H - pad * 2 - 14)
    const line = profile.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('')
    const area = `${line}L${W} ${H - 14}L0 ${H - 14}Z`
    return { W, H, line, area, y0: Math.round(Math.min(...ys)), y1: Math.round(Math.max(...ys)), km: x1 / 1000 }
  }, [profile, height])
  if (!d) return null
  return (
    <figure className="elev">
      <svg viewBox={`0 0 ${d.W} ${d.H}`} role="img" aria-label={`Perfil de altitude, entre ${d.y0} e ${d.y1} metros`}>
        <path d={d.area} fill="var(--anil-claro)" />
        <path d={d.line} fill="none" stroke="var(--anil)" strokeWidth="2" strokeLinejoin="round" />
        <text x="0" y={d.H - 2} className="elev-t">0 km</text>
        <text x={d.W} y={d.H - 2} textAnchor="end" className="elev-t">
          {d.km.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} km
        </text>
      </svg>
      <figcaption className="t-small muted">
        Altitude entre {fmtInt(d.y0)} e {fmtInt(d.y1)} m (Copernicus DEM)
      </figcaption>
    </figure>
  )
}

// miniatura do percurso para a lista de atividades
export function TrackThumb({ track, size = 76 }: { track: [number, number, number][]; size?: number }) {
  const path = useMemo(() => {
    if (track.length < 2) return ''
    const lat0 = track[0][1]
    const k = Math.cos((lat0 * Math.PI) / 180)
    const xs = track.map((p) => p[0] * k)
    const ys = track.map((p) => p[1])
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    const span = Math.max(x1 - x0, y1 - y0) || 1e-6
    const pad = 10
    const S = 100 - pad * 2
    const ox = pad + (S - ((x1 - x0) / span) * S) / 2
    const oy = pad + (S - ((y1 - y0) / span) * S) / 2
    return track.map((p, i) => `${i ? 'L' : 'M'}${(ox + ((p[0] * k - x0) / span) * S).toFixed(1)} ${(oy + ((y1 - p[1]) / span) * S).toFixed(1)}`).join('')
  }, [track])
  return (
    <svg className="thumb" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={path} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="var(--anil)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="stars-ro" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const f = Math.max(0, Math.min(1, value - i + 1))
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`sg${i}-${Math.round(f * 10)}`}>
                <stop offset={f} stopColor="var(--ocre)" />
                <stop offset={f} stopColor="var(--cal-3)" />
              </linearGradient>
            </defs>
            <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" fill={`url(#sg${i}-${Math.round(f * 10)})`} />
          </svg>
        )
      })}
    </span>
  )
}
