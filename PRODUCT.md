# Rasto · Produto

Verdade de produto para decisões de design e de texto.

## O que é

Uma app de território para o telemóvel: o concelho como tabuleiro de jogo. Para quem chega (numa casa da aldeia, no
hotel, de passagem) e para quem cá vive. Serpa é o primeiro território; a mesma plataforma serve outros municípios.

Três coisas que as pessoas já usam, numa só: um mapa para encontrar lugares, classificações para escolher onde comer e
ficar, um gravador para caminhar, correr ou pedalar. Por cima, o jogo: és uma personagem no mapa, conquistas o território
por onde passas (hexágonos de 150 m; fechar um circuito conquista o interior) e cumpres missões nos lugares reais.

## Decisões

1. Telemóvel primeiro. A web é a app (PWA instalável, mapa sem rede); Android e iOS saem do mesmo código com Capacitor.
2. O território é o jogo. Missões, selos, níveis e personagens servem para levar as pessoas aos sítios, das aldeias aos
   produtores.
3. Eventos são uma vertente secundária. O HELL160 tem página própria; o live tracking e o Hell Wall vivem no site da prova.
4. A realidade aumentada da Câmara Municipal de Serpa (cerca de 20 pontos) entra nos lugares onde está preparada.
5. Sem servidor nesta fase; o estado está isolado para ser trocado por uma API (contas, equipas, rankings, códigos de
   parceiro, indicadores para o município).

## Regras

- Só lugares com posição verificável em dados abertos. Nunca coordenadas à mão nem percursos inventados.
- Missões validam-se por estar no sítio (GPS) ou por código do parceiro. Nenhuma pergunta cuja resposta só nós saberíamos.
- Tudo o que é simulado diz que é: simulação de percursos, modo de demonstração, equipas de exemplo, tempos estimados.
- Sem rankings com pessoas inventadas. Enquanto não houver contas, os segmentos só mostram os teus tempos.

## Voz

Português europeu, concreto e seco. Sem slogans, sem emoji, sem construções "não é X, é Y". Números e factos antes de
adjetivos. Tu, não você.

## Visual

As casas do Alentejo: cal branca, a barra anil na base das paredes, a barra ocre. Anil é ação e "tu" no mapa; ocre é
território conquistado e XP. As famílias do mapa (Ver verde montado, Provar terracota, Ficar ameixa) foram validadas para
daltonismo com o anil, todos os pares, sobre o fundo do mapa. Letra única: Archivo, condensada nos números (como num
painel de corrida) e normal no texto. Ícones desenhados para a app, traço de 2 px.
