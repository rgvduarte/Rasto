# Rasto · Serpa

Mapa e missões do concelho de Serpa (Beja, Alentejo), na margem esquerda do Guadiana.
Publicado em **https://rgvduarte.github.io/Rasto/**

O jogo é para quem acompanha os atletas e para quem visita: missões em lugares reais (património, mesa, produtores,
Guadiana, aldeias), validadas pela localização do telemóvel ou por um código do parceiro. O live tracking e o Hell Wall
do HELL160 vivem no site do HELL160 (https://rgvduarte.github.io/hell160/); o Rasto liga para lá.

## O que tem

- **Mapa** (`#/mapa`): cartografia própria sobre dados abertos, servida pelo próprio site (sem Google Maps nem chave de API).
  Relevo e relevo 3D, ocupação do solo, água, 1 357 km de estradões, edifícios, limites do concelho e das freguesias.
  107 lugares com posição tirada do OpenStreetMap/Overture e, em 62, posição no ranking, classificação e ligação do TripAdvisor.
- **Missões** (`#/missoes`): 49 missões em 6 coleções, XP, níveis, selos e freguesias exploradas. Modo de demonstração para
  apresentar longe de Serpa.
- **HELL160** (`#/prova`): aldeias por onde a prova passa e o que dá para fazer enquanto se espera, por tempo disponível.
- **Sobre e dados** (`#/sobre`): o que é real e o que ainda não é, fontes e licenças, próximos passos.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # gera dist/
```

O deploy é automático: cada push para `main` (ou para o branch de desenvolvimento) corre `.github/workflows/deploy.yml`,
que publica `dist/` no branch `gh-pages`.

## Dados do mapa

As tiles já geradas estão em `public/tiles` e `public/glyphs`. Para as regenerar (Python 3 com `rasterio`, `shapely`,
`pyarrow`, `fsspec`, `aiohttp`, `contourpy`, `scipy`, `pillow`):

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
```

## Notas

- Sem backend nesta fase: o progresso fica no browser (`src/lib/store.ts`, isolado para ser trocado por uma API).
- Nenhum restaurante ou produtor aderiu ainda, por isso os códigos de parceiro só funcionam no modo de demonstração.
- O traçado oficial do HELL160 de 2027 não foi publicado; o Rasto não desenha percursos inventados.
- O mapa serve para descobrir, não para navegar. Muitos estradões atravessam herdades privadas.
