// Pequenas peças partilhadas pela interface: tamanho do ecrã, avisos, partilha, formatos de tempo e ritmo.
import { useEffect, useState, useSyncExternalStore } from 'react'

const NARROW = '(max-width: 899px)'

export function useNarrow() {
  const [n, setN] = useState(() => window.matchMedia(NARROW).matches)
  useEffect(() => {
    const mq = window.matchMedia(NARROW)
    const on = () => setN(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return n
}

export function useViewportH() {
  const [h, setH] = useState(() => window.innerHeight)
  useEffect(() => {
    const on = () => setH(window.visualViewport?.height ?? window.innerHeight)
    window.addEventListener('resize', on)
    window.visualViewport?.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      window.visualViewport?.removeEventListener('resize', on)
    }
  }, [])
  return h
}

// ---------- avisos curtos (toast) ----------
type Toast = { id: number; text: string } | null
let toast: Toast = null
let timer: number | null = null
const tsubs = new Set<() => void>()
export function say(text: string, ms = 2600) {
  toast = { id: Date.now(), text }
  tsubs.forEach((f) => f())
  if (timer) clearTimeout(timer)
  timer = window.setTimeout(() => {
    toast = null
    tsubs.forEach((f) => f())
  }, ms)
}
export function useToast() {
  return useSyncExternalStore(
    (f) => {
      tsubs.add(f)
      return () => tsubs.delete(f)
    },
    () => toast,
  )
}

// ---------- partilha ----------
export async function share(data: { title: string; text?: string; url?: string; files?: File[] }) {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  try {
    if (data.files?.length && nav.canShare?.({ files: data.files })) {
      await navigator.share({ title: data.title, text: data.text, files: data.files })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title: data.title, text: data.text, url: data.url })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancel'
  }
  if (data.files?.length) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(data.files[0])
    a.download = data.files[0].name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return 'downloaded'
  }
  if (data.url) {
    try {
      await navigator.clipboard.writeText(data.url)
      say('Ligação copiada')
      return 'copied'
    } catch {
      /* sem área de transferência */
    }
  }
  return 'none'
}

export function haptic(p: number | number[]) {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* sem vibração */
  }
}

// ---------- tempo, ritmo, datas (pt-PT) ----------
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}

export function fmtDur(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

// ritmo em min/km (caminhada e corrida) ou velocidade em km/h (bicicleta)
export function fmtPace(distanceM: number, ms: number, bike: boolean) {
  if (distanceM < 30 || ms < 5000) return bike ? '0,0' : '–'
  if (bike) return ((distanceM / 1000) / (ms / 3600000)).toLocaleString('pt-PT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  const secPerKm = ms / 1000 / (distanceM / 1000)
  if (secPerKm > 60 * 60) return '–'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`
}

export function fmtKm(m: number) {
  return (m / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export function fmtDay(t: number) {
  const d = new Date(t)
  const today = new Date()
  const y = new Date(Date.now() - 86400000)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const hm = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  if (same(d, today)) return `Hoje, ${hm}`
  if (same(d, y)) return `Ontem, ${hm}`
  return `${d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}, ${hm}`
}

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
