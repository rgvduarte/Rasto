# Rasto Serpa

O concelho de Serpa (Beja, Alentejo) como tabuleiro de jogo, numa app para o telemóvel.
Publicado em **https://rgvduarte.github.io/Rasto/** (instalável como app: no Android, Instalar; no iPhone, Partilhar e
Adicionar ao ecrã principal).

Para quem chega a Serpa e quer conhecer o território: um mapa para encontrar lugares, as classificações do TripAdvisor
para escolher, um gravador para caminhar, correr ou pedalar, e por cima um jogo. O concelho está dividido em 18 802
hexágonos de 150 m: cada um por onde passas fica teu e, se fechares um circuito, também o que fica lá dentro. Nos lugares
há missões, com selos, níveis e uma personagem tua no mapa. A realidade aumentada da Câmara Municipal de Serpa entra nos
pontos onde já está preparada (castelo, estação de Pias).

## Ecrãs

| Rota | O que é |
| --- | --- |
| `#/` | **Explorar**: mapa, pesquisa, filtros (Ver, Provar, Ficar, com missão, guardados), lista por distância ou TripAdvisor, ficha do lugar (direções, guardar, partilhar, missão, realidade aumentada, a tua avaliação, perto daqui). `#/?p=<id>` abre um lugar. |
| `#/missoes` | **Missões**: 53 missões em 7 coleções, nível, XP, a missão mais perto de ti. |
| `#/gravar` | **Gravar**: caminhada, corrida ou bicicleta com GPS; hexágonos, circuitos fechados, missões ao alcance com captura sem parar, resumo com perfil de altitude e segmentos. Simulação em percursos reais do OSM para experimentar longe de Serpa (marcada como tal). |
| `#/atividade` | **Atividade**: as tuas saídas, totais, segmentos e recordes pessoais; `?a=<id>` abre uma, com o percurso no mapa e imagem para partilhar. |
| `#/perfil` | **Perfil**: personagem, nível, território por freguesia, selos, guardados, mapa sem rede, instalar, modo de demonstração. |
| `#/sobre`, `#/eventos`, `#/cartaz` | Sobre, fontes e licenças; eventos no concelho (HELL160, com o live e o Hell Wall no site da prova); cartaz. |

## Como está feito

- Vite + React + TypeScript, rotas por hash (funciona no GitHub Pages sem servidor).
- Um só mapa (MapLibre GL) por baixo de todos os ecrãs (`src/map/MapStage.tsx`); os ecrãs dizem-lhe o que mostrar
  (`src/lib/mapview.ts`). Cartografia própria sobre dados abertos, servida pelo próprio site, sem chave de API.
- Jogo: `src/lib/recorder.ts` (GPS, desnível pelo Copernicus DEM, hexágonos, circuitos, missões ao alcance, segmentos),
  `src/lib/hex.ts` (a mesma grelha que `scripts/geo/build_game.py` gera), `src/lib/store.ts` (estado no telemóvel,
  isolado para ser trocado por uma API).
- PWA (`vite-plugin-pwa`): instalável, abre sem rede; o mapa inteiro do concelho (cerca de 28 MB) pode ser guardado no
  Perfil para os estradões sem rede.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # gera dist/
```

O deploy é automático: cada push para `main` (ou para o branch de desenvolvimento) corre `.github/workflows/deploy.yml`,
que publica `dist/` no branch `gh-pages`.

## Apps Android e iOS

O mesmo build vira app nativa com Capacitor (`capacitor.config.ts`, `appId` `pt.rasto.serpa`):

```bash
npm run build
npx cap add android      # precisa do Android Studio
npx cap add ios          # precisa do Xcode (macOS)
npx cap sync
npx cap open android     # ou: npx cap open ios
```

Para a gravação continuar com o ecrã bloqueado é preciso um plugin de localização em segundo plano
(por exemplo `@capacitor-community/background-geolocation`) e as permissões de localização "sempre" no Android e no iOS;
na web o Rasto pede ao browser para manter o ecrã ligado durante a gravação.

## Dados do mapa

As tiles já geradas estão em `public/tiles` e `public/glyphs`. Para as regenerar (Python 3 com `rasterio`, `shapely`,
`pyarrow`, `fsspec`, `aiohttp`, `contourpy`, `scipy`, `pillow`, `networkx`):

```bash
# 1. fontes (uma vez) para .geo-cache/
#    Copernicus DEM GLO-30, N37/N38 × W007/W008/W009:
#      https://copernicus-dem-30m.s3.amazonaws.com/<nome>/<nome>.tif
#    ESA WorldCover 2021, ESA_WorldCover_10m_2021_v200_N36W009_Map.tif:
#      https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/<nome>
#    Overture Maps (release 2026-09-23.1) para .geo-cache/overture e .geo-cache/overture-wide:
python3 scripts/geo/overture_extract.py theme=transportation/type=segment .geo-cache/overture/segments.parquet id,geometry,bbox,subtype,class,subclass,names,road_surface,routes,road_flags
#    (idem para places, water, land_use, infrastructure, buildings e divisions; BBOX=... para a área alargada)

# 2. raster (relevo e ocupação do solo), camadas vetoriais, tiles e glifos
cd scripts/geo && python3 build_rasters.py && python3 build_layers.py && cd ../..
npm run tiles
npm run glyphs

# 3. lugares (coordenadas do OSM/Overture + TripAdvisor de scripts/data/tripadvisor.json)
python3 scripts/data/build_pois.py

# 4. jogo: grelha de hexágonos, percursos de simulação e segmentos
cd scripts/geo && python3 build_game.py && cd ../..
```

## Notas

- Sem servidor nesta fase: progresso, atividades e avaliações ficam no telemóvel; a localização não sai do aparelho.
- Nenhum restaurante ou produtor aderiu ainda: os códigos de parceiro só funcionam no modo de demonstração.
- As animações de realidade aumentada da Câmara ainda não estão integradas; a câmara já aponta para o sítio certo.
- O mapa serve para descobrir, não para conduzir. Muitos estradões atravessam herdades privadas.
