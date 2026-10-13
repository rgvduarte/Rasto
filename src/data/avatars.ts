// Personagens do Rasto: figuras do trabalho e da cultura do concelho.
// Cada uma ganha mais 25 % de XP numa coleção (o andarilho ganha o dobro por hexágono conquistado).
import { GLYPH } from '../map/icons'

export type AvatarKind = 'cantador' | 'moleiro' | 'queijeira' | 'pastor' | 'ceifeira' | 'andarilho'

export type Avatar = { id: AvatarKind; name: string; line: string; bonus: string; collection: string | null; glyph: string }

export const AVATARS: Avatar[] = [
  { id: 'andarilho', name: 'Andarilho', line: 'Conhece os estradões todos.', bonus: 'Hexágonos valem o dobro', collection: null, glyph: GLYPH.bota },
  { id: 'cantador', name: 'Cantador', line: 'Não há largo onde não tenha cantado.', bonus: '+25 % no cante e palco', collection: 'cante', glyph: GLYPH.cante },
  { id: 'moleiro', name: 'Moleiro', line: 'Sabe onde estão as azenhas do Guadiana.', bonus: '+25 % na água e miradouros', collection: 'agua', glyph: GLYPH.azenha },
  { id: 'queijeira', name: 'Queijeira', line: 'Leite cru de ovelha e flor de cardo.', bonus: '+25 % nos produtores', collection: 'produtores', glyph: GLYPH.queijo },
  { id: 'pastor', name: 'Pastor', line: 'Anda de aldeia em aldeia.', bonus: '+25 % nas aldeias', collection: 'aldeias', glyph: GLYPH.cajado },
  { id: 'ceifeira', name: 'Ceifeira', line: 'Depois da ceifa, a mesa.', bonus: '+25 % à mesa', collection: 'mesa', glyph: GLYPH.espiga },
]

export const RINGS = ['#2348d1', '#f2b705', '#0f7a5a', '#c2410c', '#a2358c', '#000000'] as const

export const avatarById = (id: string | undefined | null) => AVATARS.find((a) => a.id === id)
