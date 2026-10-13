// Altitude a partir das tiles de relevo do próprio site (Copernicus DEM, codificação Terrarium, z12 ≈ 30 m).
// Serve para o desnível das atividades gravadas com GPS (a altitude do GPS do telemóvel é pouco fiável).
import { siteBase } from '../map/style'

const Z = 12
const cache = new Map<string, Promise<Uint8ClampedArray | null>>()

function tileOf(lon: number, lat: number) {
  const n = 2 ** Z
  const x = ((lon + 180) / 360) * n
  const r = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  return { tx: Math.floor(x), ty: Math.floor(y), px: (x - Math.floor(x)) * 256, py: (y - Math.floor(y)) * 256 }
}

function load(tx: number, ty: number) {
  const k = `${tx}/${ty}`
  let p = cache.get(k)
  if (!p) {
    p = fetch(`${siteBase()}tiles/dem/${Z}/${tx}/${ty}.png`)
      .then((r) => (r.ok ? r.blob() : null))
      .then(async (b) => {
        if (!b) return null
        const bmp = await createImageBitmap(b)
        const cv = document.createElement('canvas')
        cv.width = cv.height = 256
        const ctx = cv.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(bmp, 0, 0)
        return ctx.getImageData(0, 0, 256, 256).data
      })
      .catch(() => null)
    cache.set(k, p)
  }
  return p
}

export async function elevationAt(lon: number, lat: number): Promise<number | null> {
  const { tx, ty, px, py } = tileOf(lon, lat)
  const data = await load(tx, ty)
  if (!data) return null
  const x = Math.min(255, Math.max(0, Math.floor(px)))
  const y = Math.min(255, Math.max(0, Math.floor(py)))
  const o = (y * 256 + x) * 4
  return data[o] * 256 + data[o + 1] + data[o + 2] / 256 - 32768
}

// desnível positivo com histerese de 3 m (filtra o ruído da grelha)
export function gainOf(elevations: number[]) {
  let gain = 0
  let ref = elevations[0]
  for (const e of elevations) {
    if (e - ref >= 3) {
      gain += e - ref
      ref = e
    } else if (ref - e >= 3) ref = e
  }
  return gain
}
