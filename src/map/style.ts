// Estilo cartográfico do Rasto. Tudo é servido pelo próprio site (tiles, relevo, glifos):
// não há servidor de mapas, chave de API nem pedidos a terceiros.
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl'

export const AOI: [number, number, number, number] = [-7.745, 37.7, -7.19, 38.22]
export const WIDE: [number, number, number, number] = [-8.1, 37.5, -6.85, 38.42]
export const SERPA_BOUNDS: [[number, number], [number, number]] = [
  [-7.6823, 37.7412],
  [-7.2483, 38.1764],
]

export const C = {
  paper: '#f3efe6',
  ink: '#15130f',
  ink2: '#3f3a32',
  muted: '#6b645a',
  water: '#8db7cb',
  waterLine: '#6a9fba',
  waterInk: '#2f6683',
  road: '#ffffff',
  roadCase: '#b9ad9c',
  primary: '#f6d38a',
  primaryCase: '#b0894a',
  track: '#8a6a4a',
  contour: '#8a6d4c',
  building: '#d9cebf',
  buildingLine: '#bfb2a1',
  // famílias (validadas para daltonismo, todos os pares, sobre o fundo do mapa)
  ver: '#2456a6',
  provar: '#c2410c',
  ficar: '#0f7a5a',
  ocre: '#c48a12',
  anil: '#2456a6',
  hell: '#c8361b',
} as const

export function siteBase() {
  const { origin, pathname } = window.location
  return origin + pathname.replace(/[^/]*$/, '')
}

const zoomed = (stops: [number, number][]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flat()] as ExpressionSpecification

export type TerritoryGeo = {
  mask: GeoJSON.Geometry
  freguesias: { name: string; geometry: GeoJSON.Geometry }[]
}

export function buildStyle(t: TerritoryGeo): StyleSpecification {
  const base = siteBase()
  const halo = 'rgba(250,247,240,0.92)'
  return {
    version: 8,
    glyphs: `${base}glyphs/{fontstack}/{range}.pbf`,
    sources: {
      cover: {
        type: 'raster',
        tiles: [`${base}tiles/cover/{z}/{x}/{y}.webp`],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 14,
        bounds: WIDE,
      },
      dem: {
        type: 'raster-dem',
        tiles: [`${base}tiles/dem/{z}/{x}/{y}.png`],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 12,
        encoding: 'terrarium',
        bounds: WIDE,
      },
      v: {
        type: 'vector',
        tiles: [`${base}tiles/v/{z}/{x}/{y}.pbf`],
        minzoom: 8,
        maxzoom: 14,
        bounds: WIDE,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> via <a href="https://overturemaps.org">Overture Maps</a> · CAOP 2020 © DGT · Copernicus DEM · ESA WorldCover 2021',
      },
      'territory-mask': { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: t.mask } },
      freguesias: {
        type: 'geojson',
        promoteId: 'name',
        data: {
          type: 'FeatureCollection',
          features: t.freguesias.map((f) => ({ type: 'Feature', properties: { name: f.name }, geometry: f.geometry })),
        },
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': C.paper } },
      {
        id: 'cover',
        type: 'raster',
        source: 'cover',
        paint: { 'raster-saturation': -0.28, 'raster-contrast': -0.06, 'raster-brightness-min': 0.03, 'raster-fade-duration': 0 },
      },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem',
        paint: {
          'hillshade-method': 'multidirectional',
          'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 8, 0.55, 12, 0.42, 15, 0.3],
          'hillshade-shadow-color': '#4a3d2e',
          'hillshade-highlight-color': '#fffaf0',
          'hillshade-accent-color': '#4a3d2e',
        },
      },
      {
        id: 'landuse',
        type: 'fill',
        source: 'v',
        'source-layer': 'landuse',
        minzoom: 12,
        paint: {
          'fill-color': [
            'match', ['get', 'kind'],
            'cemetery', '#d6d2c2',
            'sport', '#d9dfc0',
            'park', '#cfdcb4',
            'industrial', '#e2d9d0',
            'quarry', '#e2dccf',
            '#e6dfd2',
          ],
          'fill-opacity': 0.7,
        },
      },
      {
        id: 'protected',
        type: 'line',
        source: 'v',
        'source-layer': 'protected',
        paint: { 'line-color': '#4f7a44', 'line-width': zoomed([[8, 1], [14, 2.2]]), 'line-opacity': 0.55, 'line-dasharray': [3, 2] },
      },
      {
        id: 'contour',
        type: 'line',
        source: 'v',
        'source-layer': 'contour',
        paint: {
          'line-color': C.contour,
          'line-width': ['interpolate', ['linear'], ['zoom'],
            10, ['case', ['==', ['get', 'idx'], 1], 0.5, 0.25],
            15, ['case', ['==', ['get', 'idx'], 1], 1.1, 0.6]],
          'line-opacity': ['case', ['==', ['get', 'idx'], 1], 0.42, 0.24],
        },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'v',
        'source-layer': 'water',
        paint: { 'fill-color': C.water, 'fill-outline-color': C.waterLine },
      },
      {
        id: 'waterway-river',
        type: 'line',
        source: 'v',
        'source-layer': 'waterway',
        filter: ['==', ['get', 'kind'], 'river'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.waterLine, 'line-width': zoomed([[8, 1.2], [12, 2.4], [15, 4]]) },
      },
      {
        id: 'waterway-stream',
        type: 'line',
        source: 'v',
        'source-layer': 'waterway',
        filter: ['in', ['get', 'kind'], ['literal', ['stream', 'canal', 'ditch']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': C.waterLine,
          'line-width': zoomed([[10, 0.5], [14, 1.2], [16, 1.8]]),
          'line-opacity': ['case', ['has', 'name'], 0.95, 0.7],
        },
      },
      // fora do concelho fica mais claro: o jogo é dentro de Serpa
      { id: 'mask', type: 'fill', source: 'territory-mask', paint: { 'fill-color': '#f7f4ec', 'fill-opacity': 0.55 } },
      // freguesias exploradas pelo jogador (feature-state 'p' entre 0 e 1)
      {
        id: 'freguesia-progress',
        type: 'fill',
        source: 'freguesias',
        paint: {
          'fill-color': C.ocre,
          'fill-opacity': ['*', 0.22, ['coalesce', ['feature-state', 'p'], 0]],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'v',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-color': C.building,
          'fill-outline-color': C.buildingLine,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 15, 1],
        },
      },
      // caminhos de terra: o terreno do trail
      {
        id: 'road-track',
        type: 'line',
        source: 'v',
        'source-layer': 'road',
        filter: ['==', ['get', 'kind'], 'track'],
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': C.track,
          'line-width': zoomed([[11, 0.7], [14, 1.4], [17, 2.4]]),
          'line-dasharray': [2.4, 1.4],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 14, 0.85],
        },
      },
      {
        id: 'road-path',
        type: 'line',
        source: 'v',
        'source-layer': 'road',
        filter: ['in', ['get', 'kind'], ['literal', ['path', 'pedestrian']]],
        paint: { 'line-color': C.track, 'line-width': zoomed([[13, 0.8], [17, 1.6]]), 'line-dasharray': [0.8, 1.2] },
      },
      {
        id: 'rail',
        type: 'line',
        source: 'v',
        'source-layer': 'rail',
        paint: { 'line-color': '#8f877b', 'line-width': 1.2, 'line-dasharray': [4, 3] },
      },
      {
        id: 'road-minor-case',
        type: 'line',
        source: 'v',
        'source-layer': 'road',
        filter: ['in', ['get', 'kind'], ['literal', ['minor', 'service']]],
        minzoom: 12,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.roadCase, 'line-width': zoomed([[12, 1.6], [15, 5], [17, 10]]) },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'v',
        'source-layer': 'road',
        filter: ['in', ['get', 'kind'], ['literal', ['minor', 'service']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['case', ['has', 'unpaved'], '#efe6d6', C.road],
          'line-width': zoomed([[11, 0.6], [12, 0.9], [15, 3.6], [17, 8]]),
        },
      },
      {
        id: 'road-main-case',
        type: 'line',
        source: 'v',
        'source-layer': 'road',
        filter: ['in', ['get', 'kind'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['match', ['get', 'kind'], ['trunk', 'primary'], C.primaryCase, C.roadCase],
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
            8, ['match', ['get', 'kind'], ['trunk', 'primary'], 1.6, 'secondary', 1.2, 0.6],
            12, ['match', ['get', 'kind'], ['trunk', 'primary'], 4, 'secondary', 3.2, 2.4],
            16, ['match', ['get', 'kind'], ['trunk', 'primary'], 13, 'secondary', 11, 9]],
        },
      },
      {
        id: 'road-main',
        type: 'line',
        source: 'v',
        'source-layer': 'road',
        filter: ['in', ['get', 'kind'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['match', ['get', 'kind'], ['trunk', 'primary'], C.primary, C.road],
          'line-width': ['interpolate', ['exponential', 1.5], ['zoom'],
            8, ['match', ['get', 'kind'], ['trunk', 'primary'], 0.9, 'secondary', 0.6, 0.2],
            12, ['match', ['get', 'kind'], ['trunk', 'primary'], 2.6, 'secondary', 2, 1.4],
            16, ['match', ['get', 'kind'], ['trunk', 'primary'], 10, 'secondary', 8.5, 7]],
        },
      },
      // limites
      {
        id: 'boundary-freguesia',
        type: 'line',
        source: 'v',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'kind'], 'freguesia'],
        paint: { 'line-color': C.ink2, 'line-width': zoomed([[10, 0.7], [14, 1.3]]), 'line-dasharray': [1, 2.2], 'line-opacity': 0.55 },
      },
      {
        id: 'boundary-concelho',
        type: 'line',
        source: 'v',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'kind'], 'concelho'],
        paint: { 'line-color': '#8d857a', 'line-width': 1, 'line-dasharray': [3, 2] },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'v',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'kind'], 'country'],
        paint: { 'line-color': C.ink2, 'line-width': zoomed([[8, 1.2], [14, 2.4]]), 'line-dasharray': [5, 2, 1, 2], 'line-opacity': 0.7 },
      },
      {
        id: 'boundary-serpa-halo',
        type: 'line',
        source: 'v',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'kind'], 'serpa'],
        paint: { 'line-color': '#ffffff', 'line-width': zoomed([[8, 4], [14, 8]]), 'line-opacity': 0.7 },
      },
      {
        id: 'boundary-serpa',
        type: 'line',
        source: 'v',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'kind'], 'serpa'],
        paint: { 'line-color': C.ink, 'line-width': zoomed([[8, 1.4], [14, 2.6]]) },
      },
      // rótulos
      {
        id: 'label-contour',
        type: 'symbol',
        source: 'v',
        'source-layer': 'contour',
        minzoom: 13,
        filter: ['==', ['get', 'idx'], 1],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['concat', ['to-string', ['get', 'ele']], ' m'],
          'text-font': ['Schibsted Regular'],
          'text-size': 10,
          'symbol-spacing': 420,
        },
        paint: { 'text-color': C.contour, 'text-halo-color': halo, 'text-halo-width': 1.4 },
      },
      {
        id: 'label-waterway',
        type: 'symbol',
        source: 'v',
        'source-layer': 'waterway',
        filter: ['has', 'name'],
        minzoom: 11,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Schibsted Italic'],
          'text-size': ['case', ['==', ['get', 'kind'], 'river'], 13, 11],
          'symbol-spacing': 360,
          'text-letter-spacing': 0.04,
        },
        paint: { 'text-color': C.waterInk, 'text-halo-color': halo, 'text-halo-width': 1.4 },
      },
      {
        id: 'label-water',
        type: 'symbol',
        source: 'v',
        'source-layer': 'water',
        filter: ['all', ['has', 'name'], ['>', ['get', 'area'], 0.08]],
        minzoom: 11,
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Schibsted Italic'], 'text-size': 11, 'text-max-width': 8 },
        paint: { 'text-color': C.waterInk, 'text-halo-color': halo, 'text-halo-width': 1.4 },
      },
      {
        id: 'label-road',
        type: 'symbol',
        source: 'v',
        'source-layer': 'road',
        filter: ['all', ['has', 'ref'], ['in', ['get', 'kind'], ['literal', ['trunk', 'primary', 'secondary']]]],
        minzoom: 10,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'ref'],
          'text-font': ['Schibsted Medium'],
          'text-size': 10,
          'symbol-spacing': 500,
          'text-rotation-alignment': 'viewport',
        },
        paint: { 'text-color': C.ink2, 'text-halo-color': '#fff', 'text-halo-width': 2 },
      },
      {
        id: 'label-street',
        type: 'symbol',
        source: 'v',
        'source-layer': 'road',
        filter: ['all', ['has', 'name'], ['in', ['get', 'kind'], ['literal', ['minor', 'tertiary', 'pedestrian']]]],
        minzoom: 15,
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Schibsted Regular'], 'text-size': 10.5 },
        paint: { 'text-color': C.ink2, 'text-halo-color': '#fff', 'text-halo-width': 1.6 },
      },
      {
        id: 'label-place',
        type: 'symbol',
        source: 'v',
        'source-layer': 'place',
        filter: ['any', ['<=', ['get', 'rank'], 3], ['>=', ['zoom'], 11]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['match', ['get', 'rank'], 1, ['literal', ['Schibsted Bold']], 2, ['literal', ['Schibsted Bold']], ['literal', ['Schibsted Medium']]],
          'text-size': ['interpolate', ['linear'], ['zoom'],
            8, ['match', ['get', 'rank'], 1, 14, 2, 12, 3, 10.5, 9.5],
            13, ['match', ['get', 'rank'], 1, 20, 2, 17, 3, 15, 13]],
          'text-letter-spacing': ['match', ['get', 'rank'], 1, 0.06, 0.02],
          'text-transform': ['match', ['get', 'rank'], 1, 'uppercase', 'none'],
          'symbol-sort-key': ['get', 'rank'],
          'text-padding': 4,
        },
        paint: {
          'text-color': ['case', ['==', ['get', 'serpa'], 1], C.ink, C.muted],
          'text-halo-color': halo,
          'text-halo-width': 1.8,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 14.5, 1, 15.5, 0],
        },
      },
    ],
  }
}
