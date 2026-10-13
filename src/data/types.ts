export type Family = 'ver' | 'provar' | 'ficar'

export type Sub =
  | 'castelo' | 'muralha' | 'igreja' | 'ermida' | 'torre' | 'palacio' | 'aqueduto'
  | 'museu' | 'cante' | 'cultura' | 'miradouro' | 'rio' | 'barragem' | 'azenha' | 'experiencia' | 'estacao'
  | 'restaurante' | 'petiscos' | 'pastelaria' | 'pizzaria' | 'queijo' | 'vinho' | 'loja'
  | 'hotel' | 'casa' | 'campismo'

export type TripAdvisor = {
  name: string
  url?: string
  rank?: number
  of?: number
  list?: 'restaurantes' | 'o que fazer'
  geo?: string
  rating?: number
  reviews?: number
  closed?: boolean
}

export type Poi = {
  id: string
  fam: Family
  sub: Sub
  name: string
  lat: number
  lon: number
  summary: string
  freguesia: string | null
  place: string
  placeKm: number
  source: { dataset: string; id: string }
  web?: string
  ta?: TripAdvisor
  approx?: boolean
}
