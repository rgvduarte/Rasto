// Instalar a app no ecrã principal (PWA). No Android o browser oferece o pedido; no iPhone explica-se o caminho no Safari.
import { useSyncExternalStore } from 'react'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: BIP | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BIP
  emit()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function useInstall() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => deferred,
  )
}

export async function install() {
  if (!deferred) return false
  await deferred.prompt()
  const r = await deferred.userChoice
  deferred = null
  emit()
  return r.outcome === 'accepted'
}
