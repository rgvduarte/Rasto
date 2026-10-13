// Ligação ao HELL160 (https://rgvduarte.github.io/hell160/).
// O live tracking e o Hell Wall vivem no site do HELL160; o Rasto só liga para lá e junta o território à espera.
// Dados de base copiados de rgvduarte/hell160 (src/data/event.ts e route.ts), provisórios para 2027.

export const HELL160 = {
  site: 'https://rgvduarte.github.io/hell160/',
  live: 'https://rgvduarte.github.io/hell160/live',
  stay: 'https://rgvduarte.github.io/hell160/alojamento',
  race: 'https://rgvduarte.github.io/hell160/provas/hell160',
  cause: 'https://rgvduarte.github.io/hell160/causa',
  name: 'HELL160',
  tagline: 'Shadows and Dust',
  start: 'Sex 2 jul 2027 · 22:00',
  startLong: 'Sexta, 2 de julho de 2027, às 22:00',
  base: 'Pavilhão Polivalente de A-do-Pinto',
  distanceKm: 164.6,
  gainM: 2648,
  limitH: 36,
  aid: 13,
  lifeBases: 3,
  provisional: true,
}

// Aldeias por onde passa a prova, segundo o site do HELL160 (traçado 2027 ainda não publicado).
// A ordem e as horas de passagem vêm do live; aqui ficam só os lugares, com o ponto de missão de cada um.
export const COURSE_VILLAGES: { name: string; poi: string }[] = [
  { name: 'A-do-Pinto', poi: 'igreja-a-do-pinto' },
  { name: 'Vale de Vargo', poi: 'igreja-sao-sebastiao-vvargo' },
  { name: 'Vila Verde de Ficalho', poi: 'igreja-sao-jorge-ficalho' },
  { name: 'Pias', poi: 'torre-relogio-pias' },
  { name: 'Vila Nova de São Bento', poi: 'igreja-sao-francisco-vnsb' },
  { name: 'Serpa', poi: 'castelo-serpa' },
  { name: 'Pulo do Lobo', poi: 'pulo-do-lobo' },
  { name: 'Brinches', poi: 'igreja-brinches' },
  { name: 'Santa Iria', poi: 'igreja-santa-iria' },
  { name: 'Vales Mortos', poi: 'capela-vales-mortos' },
]
