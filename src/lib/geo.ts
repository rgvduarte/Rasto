export type LatLon = { lat: number; lon: number }

const R = 6371.0088

export function km(a: LatLon, b: LatLon) {
  const toRad = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRad
  const dLon = (b.lon - a.lon) * toRad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const nf1 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 })

export function fmtDist(k: number) {
  if (k < 1) return `${nf0.format(Math.round((k * 1000) / 10) * 10)} m`
  if (k < 20) return `${nf1.format(k)} km`
  return `${nf0.format(k)} km`
}

export const fmtInt = (n: number) => nf0.format(n)
export const fmt1 = (n: number) => nf1.format(n)

// Estimativas honestas, a partir da distância em linha reta.
// Fator 1,35 para o desvio das estradas; 4,5 km/h a pé; 55 km/h de carro em estrada nacional.
export function walkMin(k: number) {
  return Math.round(((k * 1.35) / 4.5) * 60)
}
export function driveMin(k: number) {
  return Math.max(2, Math.round(((k * 1.35) / 55) * 60 + 2))
}

export function fmtMin(m: number) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

// Ligação para navegação externa (o mapa do Rasto não é para navegar na estrada).
export function directionsUrl(p: LatLon) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`
}
export function osmUrl(p: LatLon) {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`
}
