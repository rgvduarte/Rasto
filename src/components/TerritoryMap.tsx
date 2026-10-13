import { useEffect, useRef, useState } from 'react'
import type { Map as MLMap, GeoJSONSource, MapGeoJSONFeature, LngLatBoundsLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildStyle, SERPA_BOUNDS, WIDE, C, siteBase } from '../map/style'
import type { TerritoryGeo } from '../map/style'
import { markerImage } from '../map/icons'
import type { Poi } from '../data/types'
import { POIS } from '../data/catalog'

export type TerritoryData = TerritoryGeo & {
  places: { name: string; lat: number; lon: number; rank: number; inSerpa: boolean }[]
}

let territoryPromise: Promise<TerritoryData> | null = null
export function loadTerritory(): Promise<TerritoryData> {
  if (!territoryPromise) {
    territoryPromise = fetch(`${siteBase()}data/territory.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`territory.json ${r.status}`)
        return r.json()
      })
      .then((d) => ({ mask: d.mask, freguesias: d.freguesias, places: d.places }))
  }
  return territoryPromise
}

type Props = {
  pois: Poi[]
  done: Set<string>
  selected?: string | null
  onSelect?: (id: string | null) => void
  progress?: { name: string; p: number }[]
  interactive?: boolean
  bounds?: LngLatBoundsLike
  terrain?: boolean
  user?: { lat: number; lon: number; acc: number } | null
  label?: string
  onReady?: (map: MLMap) => void
}

function toFC(pois: Poi[], done: Set<string>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: { id: p.id, name: p.name, fam: p.fam, sub: p.sub, icon: `m-${p.fam}-${p.sub}${done.has(p.id) ? '-done' : ''}` },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    })),
  }
}

export function TerritoryMap({
  pois,
  done,
  selected = null,
  onSelect,
  progress,
  interactive = true,
  bounds = SERPA_BOUNDS,
  terrain = false,
  user = null,
  label = 'Mapa do concelho de Serpa',
  onReady,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // criar o mapa uma vez
  useEffect(() => {
    let map: MLMap | null = null
    let alive = true
    ;(async () => {
      try {
        const [{ default: maplibregl }, territory] = await Promise.all([import('maplibre-gl'), loadTerritory()])
        if (!alive || !box.current) return
        map = new maplibregl.Map({
          container: box.current,
          style: buildStyle(territory),
          bounds,
          fitBoundsOptions: { padding: 24 },
          minZoom: 9,
          maxZoom: 17.5,
          maxBounds: [
            [WIDE[0], WIDE[1]],
            [WIDE[2], WIDE[3]],
          ],
          interactive,
          attributionControl: false,
          cooperativeGestures: false,
          dragRotate: interactive,
          pitchWithRotate: interactive,
          locale: {
            'NavigationControl.ZoomIn': 'Aproximar',
            'NavigationControl.ZoomOut': 'Afastar',
            'NavigationControl.ResetBearing': 'Orientar a norte',
            'AttributionControl.ToggleAttribution': 'Fontes do mapa',
          },
        })
        mapRef.current = map
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
        if (interactive) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
        map.on('error', (e) => {
          // tiles fora da área devolvem 404; não é falha do mapa
          if (String(e?.error?.message || '').includes('404')) return
          console.warn(e?.error)
        })
        map.on('load', () => {
          if (!map) return
          const ratio = Math.min(3, Math.max(2, window.devicePixelRatio || 1))
          const combos = new Set<string>()
          for (const p of POIS) combos.add(`${p.fam}|${p.sub}`)
          for (const c of combos) {
            const [fam, sub] = c.split('|') as [Poi['fam'], Poi['sub']]
            for (const d of [false, true]) {
              const id = `m-${fam}-${sub}${d ? '-done' : ''}`
              if (!map.hasImage(id)) map.addImage(id, markerImage(sub, fam, d, ratio), { pixelRatio: ratio })
            }
          }
          map.addSource('pois', {
            type: 'geojson',
            data: toFC(pois, done),
            cluster: true,
            clusterRadius: 34,
            clusterMaxZoom: 14,
            promoteId: 'id',
          })
          map.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addLayer({
            id: 'freguesia-outline-hover',
            type: 'line',
            source: 'freguesias',
            paint: { 'line-color': C.ocre, 'line-width': ['*', 2.5, ['coalesce', ['feature-state', 'p'], 0]], 'line-opacity': 0.8 },
          })
          map.addLayer({
            id: 'user-acc',
            type: 'circle',
            source: 'user',
            paint: {
              'circle-color': C.anil,
              'circle-opacity': 0.12,
              'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, ['/', ['get', 'acc'], 150], 18, ['/', ['get', 'acc'], 0.6]],
            },
          })
          map.addLayer({
            id: 'user-dot',
            type: 'circle',
            source: 'user',
            paint: { 'circle-color': C.anil, 'circle-radius': 6.5, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 },
          })
          map.addLayer({
            id: 'poi-cluster',
            type: 'circle',
            source: 'pois',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': C.ink,
              'circle-radius': ['step', ['get', 'point_count'], 14, 6, 17, 15, 20],
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 2,
            },
          })
          map.addLayer({
            id: 'poi-cluster-n',
            type: 'symbol',
            source: 'pois',
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Schibsted Bold'], 'text-size': 12.5, 'text-allow-overlap': true },
            paint: { 'text-color': '#fff' },
          })
          map.addLayer({
            id: 'poi-selected',
            type: 'circle',
            source: 'pois',
            filter: ['==', ['get', 'id'], ''],
            paint: { 'circle-radius': 22, 'circle-color': 'rgba(21,19,15,0.12)', 'circle-stroke-color': C.ink, 'circle-stroke-width': 2 },
          })
          map.addLayer({
            id: 'poi',
            type: 'symbol',
            source: 'pois',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-allow-overlap': true,
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.82, 15, 1],
              'text-field': ['step', ['zoom'], '', 15, ['get', 'name']],
              'text-font': ['Schibsted Medium'],
              'text-size': 12,
              'text-offset': [0, 1.45],
              'text-anchor': 'top',
              'text-max-width': 9,
              'text-optional': true,
            },
            paint: { 'text-color': C.ink, 'text-halo-color': 'rgba(250,247,240,0.95)', 'text-halo-width': 1.8 },
          })
          map.on('click', 'poi-cluster', async (e) => {
            const f = e.features?.[0] as MapGeoJSONFeature | undefined
            if (!f || !map) return
            const src = map.getSource('pois') as GeoJSONSource
            const z = await src.getClusterExpansionZoom(f.properties.cluster_id)
            map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.3 })
          })
          map.on('click', 'poi', (e) => {
            const id = e.features?.[0]?.properties?.id
            if (id) onSelectRef.current?.(id)
          })
          map.on('click', (e) => {
            const hits = map!.queryRenderedFeatures(e.point, { layers: ['poi', 'poi-cluster'] })
            if (!hits.length) onSelectRef.current?.(null)
          })
          for (const l of ['poi', 'poi-cluster']) {
            map.on('mouseenter', l, () => (map!.getCanvas().style.cursor = 'pointer'))
            map.on('mouseleave', l, () => (map!.getCanvas().style.cursor = ''))
          }
          setReady(true)
          onReady?.(map)
        })
      } catch (err) {
        setFailed(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      alive = false
      map?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // dados dos pontos
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    ;(map.getSource('pois') as GeoJSONSource | undefined)?.setData(toFC(pois, done))
  }, [ready, pois, done])

  // seleção
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.setFilter('poi-selected', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selected ?? '']])
    if (selected) {
      const p = pois.find((x) => x.id === selected)
      if (p) {
        const z = Math.max(map.getZoom(), 16.2)
        map.easeTo({ center: [p.lon, p.lat], zoom: z, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700 })
      }
    }
  }, [ready, selected, pois])

  // progresso das freguesias
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !progress) return
    for (const f of progress) map.setFeatureState({ source: 'freguesias', id: f.name }, { p: f.p })
  }, [ready, progress])

  // relevo 3D
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (terrain) {
      map.setTerrain({ source: 'dem', exaggeration: 1.8 })
      map.easeTo({ pitch: 62, duration: 900 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, duration: 600 })
    }
  }, [ready, terrain])

  // posição do jogador
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const src = map.getSource('user') as GeoJSONSource | undefined
    src?.setData({
      type: 'FeatureCollection',
      features: user ? [{ type: 'Feature', properties: { acc: user.acc }, geometry: { type: 'Point', coordinates: [user.lon, user.lat] } }] : [],
    })
  }, [ready, user])

  return (
    <div className="tmap" role="region" aria-label={label}>
      <div ref={box} className="tmap-canvas" />
      {failed && (
        <div className="tmap-fail" role="alert">
          O mapa não carregou neste browser ({failed}). Precisa de WebGL.
        </div>
      )}
    </div>
  )
}
