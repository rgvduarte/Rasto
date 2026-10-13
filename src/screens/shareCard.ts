// Imagem para partilhar uma atividade (1080 × 1350, o formato vertical das redes): o percurso, os números e a marca.
import type { Activity, State } from '../lib/store'
import { fmtClock, fmtKm, fmtDay } from '../lib/ui'
import { avatarById } from '../data/avatars'
import { loadHexGrid, cellsAlong, cellsInside, cellPolygon } from '../lib/hex'

const W = 1080
const H = 1350
const FONT = '"Archivo Variable", "Helvetica Neue", Arial, sans-serif'

export async function shareCard(a: Activity, s: State): Promise<File | null> {
  try {
    await Promise.all([document.fonts.load(`800 80px ${FONT}`), document.fonts.load(`500 30px ${FONT}`)])
  } catch {
    /* sem a letra: usa a de sistema */
  }
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  const c = ctx as CanvasRenderingContext2D & { fontStretch?: string }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  // área do percurso
  const box = { x: 60, y: 60, w: W - 120, h: 760 }
  ctx.fillStyle = '#f3f4f6'
  roundRect(ctx, box.x, box.y, box.w, box.h, 36)
  ctx.fill()
  const pts = a.track
  if (pts.length > 1) {
    const k = Math.cos((pts[0][1] * Math.PI) / 180)
    const xs = pts.map((p) => p[0] * k)
    const ys = pts.map((p) => p[1])
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    const span = Math.max(x1 - x0, (y1 - y0) * (box.w / box.h)) || 1e-6
    const sc = (box.w - 160) / span
    const ox = box.x + (box.w - (x1 - x0) * sc) / 2
    const oy = box.y + (box.h - (y1 - y0) * sc) / 2
    const P = (p: [number, number, number] | [number, number]) => [ox + (p[0] * k - x0) * sc, oy + (y1 - p[1]) * sc] as const
    // o território desta saída: hexágonos do caminho e, se o percurso fecha, os de dentro
    try {
      const g = await loadHexGrid()
      const cells = new Set<number>()
      for (let i = 1; i < pts.length; i++) for (const c of cellsAlong(g, [pts[i - 1][0], pts[i - 1][1]], [pts[i][0], pts[i][1]])) cells.add(c)
      if (a.loops) for (const c of cellsInside(g, pts.map((p) => [p[0], p[1]] as [number, number]))) cells.add(c)
      ctx.save()
      roundRect(ctx, box.x, box.y, box.w, box.h, 36)
      ctx.clip()
      for (const c of cells) {
        const ring = cellPolygon(g, c)
        ctx.beginPath()
        ring.forEach((q, i) => {
          const [x, y] = P(q)
          if (i) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
        })
        ctx.closePath()
        ctx.fillStyle = 'rgba(242, 183, 5, 0.42)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(122, 88, 0, 0.55)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
    } catch {
      /* sem a grelha: só o percurso */
    }
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (const [w, col] of [[22, '#ffffff'], [10, '#2348d1']] as const) {
      ctx.beginPath()
      pts.forEach((p, i) => {
        const [x, y] = P(p)
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      })
      ctx.strokeStyle = col
      ctx.lineWidth = w
      ctx.stroke()
    }
    const [sx, sy] = P(pts[0])
    const [ex, ey] = P(pts[pts.length - 1])
    dot(ctx, sx, sy, 16, '#000000')
    dot(ctx, ex, ey, 16, '#f2b705')
  }
  if (a.simulated) {
    ctx.fillStyle = '#000000'
    roundRect(ctx, box.x + 28, box.y + 28, 230, 58, 29)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 30px ${FONT}`
    ctx.fillText('Simulação', box.x + 58, box.y + 68)
  }

  // nome e data
  ctx.fillStyle = '#000000'
  c.fontStretch = 'condensed'
  ctx.font = `800 64px ${FONT}`
  ctx.fillText(clip(ctx, a.name, W - 120), 60, 912)
  c.fontStretch = 'normal'
  ctx.font = `500 30px ${FONT}`
  ctx.fillStyle = '#5f6770'
  const who = s.name ? `${s.name}, ${avatarById(s.avatar?.kind)?.name.toLowerCase() ?? 'andarilho'}` : 'Rasto Serpa'
  ctx.fillText(`${fmtDay(a.startedAt)}. ${who}`, 60, 960)

  // números
  const stats: [string, string][] = [
    [fmtKm(a.distanceM), 'km'],
    [fmtClock(a.durationS * 1000), 'tempo'],
    [String(a.gainM), 'm a subir'],
    [String(a.cells), 'hexágonos'],
  ]
  // largura de cada número medida; a letra encolhe se não couberem os quatro numa linha
  let size = 88
  const widths = () => {
    c.fontStretch = 'condensed'
    ctx.font = `800 ${size}px ${FONT}`
    const wv = stats.map(([v]) => ctx.measureText(v).width)
    c.fontStretch = 'normal'
    ctx.font = `600 28px ${FONT}`
    return stats.map(([, l], i) => Math.max(wv[i], ctx.measureText(l).width))
  }
  let ws = widths()
  const gap = 56
  while (ws.reduce((t, x) => t + x, 0) + gap * 3 > W - 120 && size > 56) {
    size -= 4
    ws = widths()
  }
  let x = 60
  stats.forEach(([v, l], i) => {
    c.fontStretch = 'condensed'
    ctx.font = `800 ${size}px ${FONT}`
    ctx.fillStyle = i === 3 ? '#7a5800' : '#000000'
    ctx.fillText(v, x, 1090)
    c.fontStretch = 'normal'
    ctx.font = `600 28px ${FONT}`
    ctx.fillStyle = '#5f6770'
    ctx.fillText(l, x, 1132)
    x += ws[i] + gap
  })

  // barra anil, como a base das paredes caiadas
  ctx.fillStyle = '#2348d1'
  ctx.fillRect(0, H - 120, W, 120)
  ctx.fillStyle = '#ffffff'
  c.fontStretch = 'condensed'
  ctx.font = `800 52px ${FONT}`
  ctx.fillText('Rasto', 60, H - 44)
  c.fontStretch = 'normal'
  ctx.font = `600 32px ${FONT}`
  ctx.fillText('Serpa, Alentejo', 228, H - 46)
  ctx.fillStyle = '#f2b705'
  ctx.fillRect(0, H - 120, W, 10)

  const blob: Blob | null = await new Promise((res) => cv.toBlob(res, 'image/png'))
  if (!blob) return null
  return new File([blob], `rasto-${a.id}.png`, { type: 'image/png' })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.arc(x, y, r + 6, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function clip(ctx: CanvasRenderingContext2D, t: string, w: number) {
  if (ctx.measureText(t).width <= w) return t
  let s = t
  while (s.length > 4 && ctx.measureText(`${s}…`).width > w) s = s.slice(0, -1)
  return `${s}…`
}
