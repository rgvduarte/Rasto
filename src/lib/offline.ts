// Mapa sem rede: descarrega todas as tiles, glifos e dados do concelho para a cache que o service worker usa.
// No campo (estradões, Guadiana) a rede falha; com isto o mapa e o jogo continuam a funcionar.
import { siteBase } from '../map/style'

export const TILE_CACHE = 'rasto-tiles-v1'
export const DATA_CACHE = 'rasto-data-v1'

type Index = { files: string[]; bytes: number }

let idx: Promise<Index | null> | null = null
export function tileIndex() {
  if (!idx)
    idx = fetch(`${siteBase()}data/offline-index.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  return idx
}

export async function offlineStatus(): Promise<{ have: number; total: number; bytes: number } | null> {
  if (!('caches' in window)) return null
  const index = await tileIndex()
  if (!index) return null
  const cache = await caches.open(TILE_CACHE)
  const keys = await cache.keys()
  const have = new Set(keys.map((k) => new URL(k.url).pathname))
  const base = new URL(siteBase()).pathname
  const n = index.files.filter((f) => have.has(base + f)).length
  return { have: n, total: index.files.length, bytes: index.bytes }
}

export async function downloadMap(onProgress: (done: number, total: number) => void, signal?: AbortSignal) {
  const index = await tileIndex()
  if (!index) throw new Error('Sem índice das tiles')
  const tiles = await caches.open(TILE_CACHE)
  const have = new Set((await tiles.keys()).map((k) => new URL(k.url).pathname))
  const base = siteBase()
  const basePath = new URL(base).pathname
  const todo = index.files.filter((f) => !have.has(basePath + f))
  let done = index.files.length - todo.length
  onProgress(done, index.files.length)
  let k = 0
  const worker = async () => {
    while (k < todo.length) {
      if (signal?.aborted) return
      const f = todo[k++]
      try {
        const r = await fetch(base + f, { signal })
        if (r.ok) await tiles.put(base + f, r)
      } catch {
        /* sem rede a meio: o resto fica para a próxima */
      }
      done++
      if (done % 20 === 0 || done === index.files.length) onProgress(done, index.files.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  onProgress(done, index.files.length)
}

export async function clearOffline() {
  if ('caches' in window) await caches.delete(TILE_CACHE)
}
