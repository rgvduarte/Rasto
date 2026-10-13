import type { Family, Poi, Sub } from './types'
import raw from './pois.json'

export const POIS = raw as Poi[]
export const poiById = (id: string) => POIS.find((p) => p.id === id)

export const FAMILIES: { id: Family; label: string; hint: string }[] = [
  { id: 'ver', label: 'Ver', hint: 'Património, museus, cante, Guadiana' },
  { id: 'provar', label: 'Provar', hint: 'Restaurantes, petiscos, queijo, vinho, doçaria' },
  { id: 'ficar', label: 'Ficar', hint: 'Hotéis, casas, turismo rural, campismo' },
]

export const SUB_LABEL: Record<Sub, string> = {
  castelo: 'Castelo', muralha: 'Muralhas', igreja: 'Igreja', ermida: 'Ermida', torre: 'Torre', palacio: 'Palácio',
  aqueduto: 'Aqueduto', museu: 'Museu', cante: 'Cante', cultura: 'Cultura', miradouro: 'Miradouro', rio: 'Rio',
  barragem: 'Barragem', azenha: 'Azenhas', experiencia: 'Experiência', estacao: 'Antiga estação', restaurante: 'Restaurante', petiscos: 'Petiscos',
  pastelaria: 'Doçaria', pizzaria: 'Pizzaria', queijo: 'Queijaria', vinho: 'Vinho', loja: 'Produtos regionais',
  hotel: 'Hotel', casa: 'Casa / turismo rural', campismo: 'Campismo',
}
