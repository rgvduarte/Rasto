// Pictogramas do Rasto (silhuetas cheias numa grelha de 20 × 20).
// Os mesmos desenhos servem os marcadores do mapa e a interface, para a identidade nunca depender só da cor.
import type { Family, Sub } from '../data/types'
import { C } from './style'

export const GLYPH: Record<Sub | 'check' | 'flag' | 'pin' | 'cajado' | 'espiga' | 'bota', string> = {
  castelo: 'M3 18V7h2.4V4.5h2.2V7h1.3V4.5h2.2V7h1.3V4.5h2.2V7H17v11h-5.2v-3.6a1.8 1.8 0 0 0-3.6 0V18z',
  muralha: 'M1.5 18V8.5h2V6.3h2.2v2.2h1.6V6.3h2.2v2.2h1.6V6.3h2.2v2.2h1.6V6.3h2.2v2.2h1.4V18zM8.4 18v-3.4a1.6 1.6 0 0 1 3.2 0V18z',
  igreja: 'M9.1 1h1.8v2.3h2v1.8h-2v1.9l5.6 4.1V18h-4.4v-3.7a2.1 2.1 0 0 0-4.2 0V18H3.5v-6.9L9.1 7V5.1h-2V3.3h2z',
  ermida: 'M9.2 2h1.6v2h1.8v1.5h-1.8v1.2L16 11v7H4v-7l5.2-4.3V5.5H7.4V4h1.8zM8.3 18h3.4v-3.2a1.7 1.7 0 0 0-3.4 0z',
  torre: 'M6.5 18V5.5L10 2l3.5 3.5V18zM10 7.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6zm-.6 1v1.9l1.4.9.5-.7-1-.7V8.2z',
  palacio: 'M10 2.5 2 7v1.5h16V7zM3 9.6h14V18h-4.5v-4.2a2.5 2.5 0 0 0-5 0V18H3z',
  aqueduto: 'M1.5 5h17v2.2h-1.3V18h-2.6v-6.1a2 2 0 0 0-4 0V18H9.4v-6.1a2 2 0 0 0-4 0V18H2.8V7.2H1.5z',
  museu: 'M10 1.8 1.8 6v2h16.4V6zM3.2 9.2h2.4v6.5H3.2zm3.9 0h2.4v6.5H7.1zm3.9 0h2.4v6.5H11zm3.9 0h2.4v6.5h-2.4zM1.8 16.8h16.4V19H1.8z',
  cante: 'M6.5 3.5 17 1.5v11.3a2.8 2.8 0 1 1-1.9-2.6V6l-6.7 1.3v7.5a2.8 2.8 0 1 1-1.9-2.6z',
  cultura: 'M2 2.5h16V5c-2.3.3-3.4 2.2-3.4 5.1s1.1 4.8 3.4 5.1v2.3H2v-2.3c2.3-.3 3.4-2.2 3.4-5.1S4.3 5.3 2 5zm6.6 3.8v7.4L14 10z',
  miradouro: 'M3.3 6.5h4.4l.8 2.2h3l.8-2.2h4.4l1.5 6.3a3.6 3.6 0 1 1-7.1 1v-2.1H9v2.1a3.6 3.6 0 1 1-7.1-1zM5.5 11.6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  rio: 'M1.5 6.2c2.1 0 2.1-1.6 4.2-1.6s2.1 1.6 4.3 1.6 2.1-1.6 4.3-1.6 2.1 1.6 4.2 1.6v2.2c-2.1 0-2.1-1.6-4.2-1.6s-2.1 1.6-4.3 1.6-2.1-1.6-4.3-1.6-2.1 1.6-4.2 1.6zm0 5c2.1 0 2.1-1.6 4.2-1.6s2.1 1.6 4.3 1.6 2.1-1.6 4.3-1.6 2.1 1.6 4.2 1.6v2.2c-2.1 0-2.1-1.6-4.2-1.6s-2.1 1.6-4.3 1.6-2.1-1.6-4.3-1.6-2.1 1.6-4.2 1.6z',
  barragem: 'M4 2.5h5l2 12h-9zM12 6c1.6 0 1.6-1.2 3.2-1.2S16.8 6 18.5 6v2c-1.7 0-1.7-1.2-3.3-1.2S13.6 8 12 8zm0 4.5c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.3 1.2v2c-1.7 0-1.7-1.2-3.3-1.2s-1.6 1.2-3.2 1.2zM1.5 16h17v2h-17z',
  azenha: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2.1c.5 0 1 .1 1.4.2L10 8.2 8.6 4.3c.4-.1.9-.2 1.4-.2zm4.2 1.8a6 6 0 0 1 1 1.3l-3.8 1.7zm-8.4 0 2.8 3-3.8-1.7a6 6 0 0 1 1-1.3zM10 8.6a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zm-5.9 2.2 3.8-.4-3.3 2.4a6 6 0 0 1-.5-2zm11.8 0a6 6 0 0 1-.5 2l-3.3-2.4zm-7.6 2 .4 3.2a6 6 0 0 1-2.4-1.1zm3.4 0 2 2.1a6 6 0 0 1-2.4 1.1z',
  experiencia: 'M5 2h1.9v1.2l9.6 3.6-9.6 3.9V18H5z',
  restaurante: 'M4.4 1.5h1.4v5.2h1V1.5h1.4v5.2h1V1.5h1.4v6.2c0 1.3-.9 2.3-2.1 2.6V18.5H6.5v-8.2a2.7 2.7 0 0 1-2.1-2.6zm9.4 0c1.9 0 3 2.2 3 5.4 0 2.1-.7 3.4-1.6 3.9v7.7h-2.1V1.5z',
  petiscos: 'M1.8 8.5h16.4a8.2 8.2 0 0 1-16.4 0zm3 8.5h10.4v1.8H4.8zM6.5 1.5l1.4.4-1.6 5.6-1.4-.4zm4 0h1.5v5.8h-1.5z',
  pastelaria: 'M3.5 8.7C3.5 5.3 6.4 3 10 3s6.5 2.3 6.5 5.7zM2.8 10.2h14.4l-1.6 7.3H4.4z',
  pizzaria: 'M10 18.5 2.2 4.4C4.5 3 7.2 2.2 10 2.2s5.5.8 7.8 2.2zM7.2 6.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm5 1.3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm-2.3 4.1a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
  queijo: 'M1.5 9.5 12.8 3.5l5.7 6v7.5h-17zm5 2.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm7.2 1.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2.6-3.8a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z',
  vinho: 'M5.5 1.5h9c.4 1.6.6 3 .6 4.3 0 3-1.8 5.1-4.1 5.5v4.6h3.3v2.6H5.7v-2.6H9v-4.6c-2.3-.4-4.1-2.5-4.1-5.5 0-1.3.2-2.7.6-4.3z',
  loja: 'M6.6 5.2a3.4 3.4 0 0 1 6.8 0h3l1 13.3H2.6l1-13.3zm1.8 0h3.2a1.6 1.6 0 0 0-3.2 0z',
  hotel: 'M1.5 4.5h2v6.2h6.6V7.5H16a2.5 2.5 0 0 1 2.5 2.5v6.5h-2v-2.3h-13v2.3h-2zm4.6 2.4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z',
  casa: 'M10 2.2 1.8 9.4l1.3 1.4 1.1-.9V18h4.5v-4.8h2.6V18h4.5V9.9l1.1.9 1.3-1.4z',
  campismo: 'M10 2.4 18.5 18h-17zm0 6.3L6.4 15.6h7.2z',
  estacao: 'M6 2.5h8a3 3 0 0 1 3 3V13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5.5a3 3 0 0 1 3-3zm.2 2.8v4.2h7.6V5.3H6.2zm.3 6.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm7 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM6 16.8h2.2l-1.6 2.7H4.4zm5.8 0H14l1.6 2.7h-2.2z',
  cajado: 'M12.6 1.8a4.6 4.6 0 0 1 4.6 4.6v1.4h-2.3V6.4a2.3 2.3 0 0 0-4.6 0v12.4H8V6.4a4.6 4.6 0 0 1 4.6-4.6z',
  espiga: 'M9.2 19.5V6.5h1.6v13zM10 1.6c1.3 1.1 1.7 2.6 1.2 4.4C9.6 5.6 8.8 4.4 8.8 2.7c.3-.5.7-.9 1.2-1.1zM5.8 6.5c1.7.2 2.9 1.3 3.3 3-1.7.3-3-.5-3.7-2.1.1-.4.2-.7.4-.9zm8.4 0c.2.2.3.5.4.9-.7 1.6-2 2.4-3.7 2.1.4-1.7 1.6-2.8 3.3-3zm-8.4 4.4c1.7.2 2.9 1.3 3.3 3-1.7.3-3-.5-3.7-2.1.1-.4.2-.7.4-.9zm8.4 0c.2.2.3.5.4.9-.7 1.6-2 2.4-3.7 2.1.4-1.7 1.6-2.8 3.3-3z',
  bota: 'M5.5 2.2h5.6v8.3l5.4 2.1a2.6 2.6 0 0 1 1.7 2.4v3.6H3.5v-3.4l2-1.8z',
  check: 'M7.6 14.6 3.4 10.4l1.6-1.6 2.6 2.6 7.4-7.4 1.6 1.6z',
  flag: 'M5 2h1.9v1.2l9.6 3.6-9.6 3.9V18H5z',
  pin: 'M10 1.5a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6zm0 3.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z',
}

export const FAMILY_COLOR: Record<Family, string> = { ver: C.ver, provar: C.provar, ficar: C.ficar }

// desenha um marcador (círculo da família com anel branco e pictograma branco) para o mapa
export function markerImage(sub: Sub, fam: Family, done: boolean, ratio: number): ImageData {
  const size = 30
  const px = Math.round(size * ratio)
  const cv = document.createElement('canvas')
  cv.width = cv.height = px
  const ctx = cv.getContext('2d')!
  ctx.scale(ratio, ratio)
  const c = FAMILY_COLOR[fam]
  const r = 12.5
  ctx.beginPath()
  ctx.arc(15, 15, r + 1.8, 0, Math.PI * 2)
  ctx.fillStyle = done ? c : '#ffffff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(15, 15, r, 0, Math.PI * 2)
  ctx.fillStyle = done ? '#ffffff' : c
  ctx.fill()
  ctx.save()
  ctx.translate(15 - 7.2, 15 - 7.2)
  ctx.scale(0.72, 0.72)
  ctx.fillStyle = done ? c : '#ffffff'
  ctx.fill(new Path2D(done ? GLYPH.check : GLYPH[sub]), 'evenodd')
  ctx.restore()
  return ctx.getImageData(0, 0, px, px)
}
