// Missões do Rasto em Serpa.
// Regras:
//  - cada missão é num lugar real do mapa (pois.json) e valida-se de forma verificável:
//      'gps'    estar a menos de `radius` metros do ponto (geolocalização do telemóvel)
//      'codigo' código dado pelo parceiro (restaurante, produtor) no balcão ou no talão
//  - nenhuma missão pede uma resposta que só nós saberíamos: o conteúdo factual vem do parceiro ou do local.
//  - XP proporcional ao esforço e ao impacto local: um almoço num parceiro vale mais do que uma fotografia.
import { POIS } from './catalog'

export type Check = 'gps' | 'codigo'

export type Mission = {
  id: string
  poi: string
  title: string
  brief: string
  xp: number
  check: Check
  radius?: number
  collection: string
}

export type Collection = {
  id: string
  name: string
  lede: string
  goal: number
  bonus: number
  seal: string
}

export const COLLECTIONS: Collection[] = [
  { id: 'intramuros', name: 'Dentro das muralhas', lede: 'O centro histórico de Serpa a pé: castelo, aqueduto, nora, igrejas e museus.', goal: 8, bonus: 250, seal: 'Intramuros' },
  { id: 'agua', name: 'Água e miradouros', lede: 'O Guadiana, as azenhas, a barragem romana, o Enxoé e os altos de onde se vê a planície.', goal: 5, bonus: 300, seal: 'Guadiana' },
  { id: 'mesa', name: 'À mesa', lede: 'Almoçar e jantar nas casas do concelho. O código é dado ao balcão.', goal: 3, bonus: 250, seal: 'Mesa alentejana' },
  { id: 'produtores', name: 'Queijo, vinho e doçaria', lede: 'Quem faz o Queijo Serpa, o vinho de Pias e os doces. Compra ou prova e recebe o código.', goal: 3, bonus: 300, seal: 'Produtores' },
  { id: 'aldeias', name: 'As aldeias', lede: 'As igrejas e os largos das aldeias do concelho, por onde passa o HELL160.', goal: 5, bonus: 350, seal: 'Aldeias' },
  { id: 'cante', name: 'Cante e palco', lede: 'O cante alentejano e as salas onde se ouve.', goal: 2, bonus: 150, seal: 'Cante' },
]

const gps = (poi: string, title: string, brief: string, xp: number, collection: string, radius = 80): Mission => ({
  id: `m-${poi}`, poi, title, brief, xp, check: 'gps', radius, collection,
})
const code = (poi: string, title: string, brief: string, xp: number, collection: string): Mission => ({
  id: `m-${poi}`, poi, title, brief, xp, check: 'codigo', collection,
})

export const MISSIONS: Mission[] = [
  gps('castelo-serpa', 'Subir ao castelo', 'Entra no castelo e procura a torre de menagem.', 40, 'intramuros'),
  gps('aqueduto-serpa', 'Seguir o aqueduto', 'Acompanha o aqueduto ao longo da muralha.', 40, 'intramuros', 120),
  gps('palacio-ficalho', 'Encontrar a nora', 'O aqueduto acaba na nora do Palácio dos Condes de Ficalho. Chega lá.', 40, 'intramuros'),
  gps('torre-relogio-serpa', 'Torre do Relógio', 'Vai até à torre do relógio, ao lado da igreja matriz.', 30, 'intramuros'),
  gps('igreja-santa-maria', 'O largo das oliveiras', 'Senta-te no largo da Igreja de Santa Maria.', 30, 'intramuros'),
  gps('museu-relogio', 'Museu do Relógio', 'Visita a coleção no Convento do Mosteirinho.', 60, 'intramuros', 60),
  gps('museu-etnografico', 'Museu Etnográfico', 'Visita o museu dos ofícios do concelho.', 60, 'intramuros', 60),
  gps('convento-sao-paulo', 'Convento de São Paulo', 'Passa pelo antigo convento de São Paulo.', 30, 'intramuros'),
  gps('igreja-salvador', 'Igreja do Salvador', 'Chega ao Largo do Salvador.', 30, 'intramuros'),
  gps('santuario-carmo', 'O Santuário', 'Encontra a igreja do Carmo dentro das muralhas.', 30, 'intramuros'),
  gps('misericordia-serpa', 'Misericórdia', 'Chega à Igreja da Misericórdia e ao seu portal gótico.', 30, 'intramuros'),
  gps('convento-santo-antonio', 'Convento de Santo António', 'Vai até ao convento franciscano de 1463, a nascente do centro.', 40, 'intramuros', 100),

  gps('pulo-do-lobo', 'O Pulo do Lobo', 'Chega ao miradouro do Pulo do Lobo, no Parque Natural do Vale do Guadiana.', 200, 'agua', 250),
  gps('azenhas-guadiana', 'Azenhas do Guadiana', 'Desce à margem e encontra as azenhas do Porto de Vale de Beirão.', 150, 'agua', 250),
  gps('barragem-enxoe', 'Barragem do Enxoé', 'Vai até ao paredão da barragem do Enxoé.', 100, 'agua', 300),
  gps('miradouro-sao-gens', 'Alto de São Gens', 'Sobe ao miradouro de São Gens.', 60, 'agua', 120),
  gps('ermida-guadalupe', 'Ermida de Guadalupe', 'Chega à ermida caiada no alto de São Gens.', 50, 'agua', 100),
  gps('atalaia-da-torre', 'Atalaia da Torre', 'Encontra a torre de vigia a norte da cidade.', 80, 'agua', 150),
  gps('barragem-romana', 'Muro dos Mouros', 'Encontra os vestígios da barragem romana.', 120, 'agua', 250),
  gps('ponte-enxoe', 'Ponte do Enxoé', 'Atravessa a ponte velha sobre a ribeira do Enxoé.', 80, 'agua', 150),

  code('molho-bico', 'Almoço no Molhó Bico', 'Come no Molhó Bico. O código é dado com a conta.', 100, 'mesa'),
  code('o-alentejano', 'Mesa n’O Alentejano', 'Almoça ou janta n’O Alentejano, na Praça da República.', 100, 'mesa'),
  code('o-engrola', 'Petiscos n’O Engrola', 'Pergunta o que há hoje e pede um petisco.', 80, 'mesa'),
  code('pedra-de-sal', 'Pedra de Sal', 'Come no Pedra de Sal.', 100, 'mesa'),
  code('cervejaria-lebrinha', 'Cervejaria Lebrinha', 'Uma imperial e umas migas na Rua do Calvário.', 100, 'mesa'),
  code('chanca-serpa-hotel', 'Jantar no Chança', 'Janta no restaurante do Serpa Hotel.', 120, 'mesa'),
  code('taberna-velhinha', 'Taberna Velhinha', 'Petisca na esplanada do Largo dos Santos Próculo e Hilarião.', 80, 'mesa'),
  code('o-adro-pias', 'O Adro, em Pias', 'Almoça n’O Adro, em Pias.', 120, 'mesa'),
  code('tapas-come-vnsb', 'TAPAS.COMe', 'Petisca no TAPAS.COMe, em Vila Nova de São Bento.', 120, 'mesa'),
  code('boa-vista-ficalho', 'Boa Vista, em Ficalho', 'Come no Boa Vista, junto à fronteira.', 120, 'mesa'),

  code('queijaria-guilherme', 'Queijo Serpa na origem', 'Compra queijo na Queijaria Guilherme. O código vem no talão.', 150, 'produtores'),
  code('monte-das-louzeiras', 'Prova no Monte das Louzeiras', 'Faz uma prova de vinho ou de azeite.', 150, 'produtores'),
  code('monge-e-filhas', 'Vinhos de Serpa', 'Prova ou compra vinho de Serpa.', 100, 'produtores'),
  code('familia-margaca', 'Vinho de Pias', 'Prova ou compra vinho da Família Margaça, em Pias.', 120, 'produtores'),
  code('adega-do-montado', 'Adega do Montado', 'Passa pela adega, em Brinches.', 120, 'produtores'),
  code('casa-paixao', 'Doces da Casa Paixão', 'Compra um doce tradicional.', 60, 'produtores'),
  code('d-luis-regionais', 'Produtos regionais', 'Compra um produto do concelho na D. Luís.', 60, 'produtores'),

  gps('igreja-a-do-pinto', 'A-do-Pinto', 'Chega ao largo da igreja de A-do-Pinto, partida e meta do HELL160.', 60, 'aldeias', 150),
  gps('igreja-brinches', 'Brinches', 'Chega à Igreja Matriz de Brinches.', 60, 'aldeias', 150),
  gps('torre-relogio-pias', 'Pias', 'Chega à Torre do Relógio de Pias.', 60, 'aldeias', 150),
  gps('igreja-sao-francisco-vnsb', 'Vila Nova de São Bento', 'Chega à Igreja de São Francisco.', 60, 'aldeias', 150),
  gps('igreja-sao-sebastiao-vvargo', 'Vale de Vargo', 'Chega à igreja de Vale de Vargo.', 60, 'aldeias', 150),
  gps('igreja-sao-jorge-ficalho', 'Vila Verde de Ficalho', 'Chega à Igreja de São Jorge, a 3 km de Espanha.', 80, 'aldeias', 150),
  gps('ermida-pazes-ficalho', 'Nossa Senhora das Pazes', 'Sobe à ermida das Pazes, já perto da fronteira.', 100, 'aldeias', 150),
  gps('igreja-santa-iria', 'Santa Iria', 'Chega à igreja de Santa Iria.', 80, 'aldeias', 150),
  gps('capela-vales-mortos', 'Vales Mortos', 'Chega à capela de Vales Mortos.', 100, 'aldeias', 150),

  gps('casa-do-cante', 'Casa do Cante', 'Visita a Casa do Cante.', 60, 'cante', 60),
  gps('musiberia', 'Musibéria', 'Vai a um espetáculo ou visita a Musibéria.', 60, 'cante', 80),
  gps('cine-teatro-serpa', 'Cine-Teatro', 'Vê um espetáculo ou um filme no Cine-Teatro Municipal.', 60, 'cante', 80),
]

export const missionByPoi = (id: string) => MISSIONS.find((m) => m.poi === id)
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id)

// integridade: todas as missões apontam para pontos que existem
for (const m of MISSIONS) if (!POIS.some((p) => p.id === m.poi)) throw new Error(`missão sem ponto: ${m.id}`)

export const MAX_XP =
  MISSIONS.reduce((s, m) => s + m.xp, 0) + COLLECTIONS.reduce((s, c) => s + c.bonus, 0)
