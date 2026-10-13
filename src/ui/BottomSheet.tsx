// Folha deslizante, como no Google Maps: três alturas (espreitar, meio, cheio), arrasta-se pela pega, pelo cabeçalho
// e pelo corpo; com a folha cheia o corpo faz scroll e, no topo, puxar para baixo volta a arrastar a folha.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  snaps: number[] // alturas visíveis em px, por ordem crescente
  index: number
  onIndex: (i: number) => void
  header?: ReactNode
  children: ReactNode
  label: string
  resetKey?: string // muda quando o conteúdo muda (volta ao topo)
}

export function BottomSheet({ snaps, index, onIndex, header, children, label, resetKey }: Props) {
  const max = snaps[snaps.length - 1]
  const i = Math.min(index, snaps.length - 1)
  const h = snaps[i]
  const full = i === snaps.length - 1
  const [dragH, setDragH] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const st = useRef<{ y0: number; h0: number; samples: [number, number][]; active: boolean; pointer?: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0
  }, [resetKey])

  const setD = (v: number | null) => {
    dragRef.current = v
    setDragH(v)
  }

  const begin = (y: number, pointer?: number) => {
    st.current = { y0: y, h0: dragRef.current ?? h, samples: [[performance.now(), y]], active: false, pointer }
  }
  const move = (y: number) => {
    const s = st.current
    if (!s) return false
    const dy = y - s.y0
    if (!s.active) {
      if (Math.abs(dy) < 7) return false
      s.active = true
      if (s.pointer !== undefined) root.current?.setPointerCapture(s.pointer)
    }
    s.samples.push([performance.now(), y])
    if (s.samples.length > 6) s.samples.shift()
    let nh = s.h0 - dy
    if (nh > max) nh = max + (nh - max) * 0.2
    if (nh < snaps[0]) nh = snaps[0] - (snaps[0] - nh) * 0.35
    setD(nh)
    return true
  }
  const end = () => {
    const s = st.current
    st.current = null
    if (!s || !s.active) return
    const cur = dragRef.current ?? h
    const [t0, y0] = s.samples[0]
    const [t1, y1] = s.samples[s.samples.length - 1]
    const v = (y1 - y0) / Math.max(1, t1 - t0) // px/ms, positivo = para baixo
    let target = 0
    if (Math.abs(v) > 0.4) {
      if (v > 0) {
        target = 0
        for (let k = snaps.length - 1; k >= 0; k--) if (snaps[k] < cur - 8) { target = k; break }
      } else {
        target = snaps.length - 1
        for (let k = 0; k < snaps.length; k++) if (snaps[k] > cur + 8) { target = k; break }
      }
    } else {
      let best = Infinity
      snaps.forEach((sv, k) => {
        if (Math.abs(sv - cur) < best) {
          best = Math.abs(sv - cur)
          target = k
        }
      })
    }
    setD(null)
    onIndex(target)
  }

  // corpo com a folha cheia: deixa o scroll nativo e, no topo, puxar para baixo arrasta a folha
  useEffect(() => {
    const el = body.current
    if (!el || !full) return
    let y0: number | null = null
    let dragging = false
    const ts = (e: TouchEvent) => {
      y0 = el.scrollTop <= 0 ? e.touches[0].clientY : null
      dragging = false
    }
    const tm = (e: TouchEvent) => {
      if (y0 === null) return
      const y = e.touches[0].clientY
      if (!dragging) {
        if (y - y0 > 7 && el.scrollTop <= 0) {
          dragging = true
          begin(y0)
        } else if (y0 - y > 7) {
          y0 = null
          return
        } else return
      }
      if (e.cancelable) e.preventDefault()
      move(y)
    }
    const te = () => {
      if (dragging) end()
      y0 = null
      dragging = false
    }
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', te)
    el.addEventListener('touchcancel', te)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te)
      el.removeEventListener('touchcancel', te)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, h])

  const shown = dragH ?? h
  return (
    <section
      ref={root}
      className={`sheet${dragH === null ? ' anim' : ''}`}
      style={{ height: max, transform: `translateY(${Math.max(0, max - shown)}px)` }}
      aria-label={label}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        const inBody = body.current?.contains(e.target as Node)
        if (inBody && full) return
        const t = e.target as HTMLElement
        if (t.closest('input, textarea, select')) return
        begin(e.clientY, e.pointerId)
      }}
      onPointerMove={(e) => {
        if (st.current?.pointer === e.pointerId) move(e.clientY)
      }}
      onPointerUp={(e) => {
        if (st.current?.pointer === e.pointerId) end()
      }}
      onPointerCancel={() => {
        if (st.current) {
          st.current = null
          setD(null)
        }
      }}
    >
      <button
        className="sheet-handle"
        aria-label={full ? 'Encolher' : 'Expandir'}
        onClick={() => onIndex(full ? Math.max(0, snaps.length - 2) : i + 1)}
      />
      {header && <div className="sheet-head">{header}</div>}
      <div ref={body} className={`sheet-body${full ? ' scroll' : ''}`}>
        {children}
      </div>
    </section>
  )
}

// mede uma vez as margens seguras (entalhe e barra de gestos) que o CSS conhece mas o JS não
let safe: { top: number; bottom: number } | null = null
export function safeArea() {
  if (safe) return safe
  const p = document.createElement('div')
  p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'
  document.body.appendChild(p)
  const cs = getComputedStyle(p)
  safe = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 }
  p.remove()
  return safe
}
