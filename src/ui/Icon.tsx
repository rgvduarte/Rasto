// Ícones de interface do Rasto: traço de 2 px numa grelha de 24, pontas redondas.
// Desenhados para esta app (não são de uma biblioteca) para a interface não parecer um kit genérico.
import type { CSSProperties } from 'react'

const P: Record<string, string> = {
  explorar: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14',
  missoes: 'M5 21V4m0 0h11.5l-2.2 4 2.2 4H5',
  gravar: '',
  atividade: 'M3 12h4l2.5-6 4 12 2.5-6H21',
  perfil: 'M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM4.5 20.5c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5',
  procurar: 'M10.75 18a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5ZM16 16l4.5 4.5',
  fechar: 'M6 6l12 12M18 6 6 18',
  voltar: 'M15 5l-7 7 7 7',
  partilhar: 'M12 3.5v11M8 7.5l4-4 4 4M6 11v8.5h12V11',
  guardar: 'M7 3.5h10v17l-5-3.6-5 3.6v-17Z',
  direcoes: 'M12 2.8 21.2 12 12 21.2 2.8 12 12 2.8ZM9 14.5v-2.5a1.5 1.5 0 0 1 1.5-1.5h4m-2-2 2 2-2 2',
  camara: 'M4 7.5h3.2L9 5h6l1.8 2.5H20v11.5H4V7.5Zm8 9a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z',
  localizar: 'M12 19.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM12 2v3m0 14v3M2 12h3m14 0h3M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  play: 'M7.5 4.8v14.4L19 12 7.5 4.8Z',
  pausa: 'M8 5v14m8-14v14',
  parar: 'M6.5 6.5h11v11h-11z',
  camadas: 'm12 3.5 9 4.8-9 4.8-9-4.8 9-4.8Zm-9 8.6 9 4.8 9-4.8M3 16l9 4.8 9-4.8',
  relevo: 'M2.5 19.5 9 8l3.5 6 2.3-3.5 6.7 9H2.5Z',
  tempo: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5V12l3 2',
  hexagono: 'M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4l8-4.6Z',
  trofeu: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4.5a3.5 3.5 0 0 0 3.6 4M16 6h3.5a3.5 3.5 0 0 1-3.6 4M12 13v4m-4 3.5h8',
  estrela: 'm12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 11v5.5M12 7.6v.4',
  instalar: 'M12 3.5v11m-4.2-4.2L12 14.5l4.2-4.2M5 15v4.5h14V15',
  mapa: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
  mais: 'M12 5v14M5 12h14',
  check: 'm4.5 12.5 4.5 4.5 10.5-10.5',
  seta: 'M5 12h14m-6-6 6 6-6 6',
  offline: 'M3.5 3.5l17 17M8.6 8.4A9.6 9.6 0 0 0 4 11m15.9-1.8A12 12 0 0 0 9.8 6.3M12 19.5h.01M8.5 15.3a5 5 0 0 1 7-0.1',
  bussola: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Zm3.5-12-2 5.5-5.5 2 2-5.5 5.5-2Z',
}

export type IconName = keyof typeof P

export function Icon({ name, size = 22, stroke = 2, fill, style, label }: { name: IconName; size?: number; stroke?: number; fill?: string; style?: CSSProperties; label?: string }) {
  if (name === 'gravar') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} style={style}>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth={stroke} />
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} style={style}>
      <path d={P[name]} />
    </svg>
  )
}
