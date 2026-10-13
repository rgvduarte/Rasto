// Realidade aumentada: os conteúdos são do roteiro da Câmara Municipal de Serpa (2018, cerca de 20 pontos).
// Ainda não foram integrados: aqui fica o que cada ponto vai mostrar, para a câmara do Rasto já saber onde e para onde apontar.
export type ArSpot = {
  poi: string
  title: string
  aim: string
  shows: string
  status: 'por-integrar' | 'disponivel'
}

export const AR_SPOTS: ArSpot[] = [
  {
    poi: 'castelo-serpa',
    title: 'A torre destruída',
    aim: 'Aponta para a torre caída do castelo.',
    shows: 'Em 1707, quando as tropas espanholas do duque de Osuna saíram de Serpa, uma explosão destruiu uma das torres. A animação da Câmara mostra a torre antes e o momento da destruição.',
    status: 'por-integrar',
  },
  {
    poi: 'estacao-pias',
    title: 'A estação de Pias',
    aim: 'Aponta para o edifício da estação.',
    shows: 'Como era a estação do Ramal de Moura há cerca de 50 anos, quando ainda passava o comboio entre Beja e Moura.',
    status: 'por-integrar',
  },
]

export const arByPoi = (id: string) => AR_SPOTS.find((a) => a.poi === id)
