// O mapa único da app. Fica por baixo de todos os ecrãs, como no Google Maps; os ecrãs dizem-lhe o que mostrar (lib/mapview).
import { useEffect, useRef, useState } from 'react'
import type { Map as MLMap, GeoJSONSource, MapGeoJSONFeature, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { buildStyle, SERPA_BOUNDS, WIDE, C } from './style'
import { markerImage } from './icons'
import { mapView, type MapView } from '../lib/mapview'
import { loadTerritory } from './territory'
import { loadHexGrid, gridGeoJSON, type HexGrid } from '../lib/hex'
import { store } from '../lib/store'
import { setPlaces } from '../lib/recorder'
import { POIS } from '../data/catalog'
import { avatarById, AVATARS } from '../data/avatars'
import type { Poi } from '../data/types'

function poiFC(pois: Poi[], done: Set<string>, inRange: Set<string>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: { id: p.id, name: p.name, fam: p.fam, icon: `m-${p.fam}-${p.sub}${done.has(p.id) ? '-done' : ''}`, near: inRange.has(p.id) ? 1 : 0 },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    })),
  }
}

function circle(lon: number, lat: number, m: number): GeoJSON.Feature {
  const ring: [number, number][] = []
  const kx = 111320 * Math.cos((lat * Math.PI) / 180)
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    ring.push([lon + (Math.cos(a) * m) / kx, lat + (Math.sin(a) * m) / 110574])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
}

function avatarEl() {
  const el = document.createElement('div')
  el.className = 'avatar-mk'
  el.innerHTML = '<div class="avatar-ground"></div><div class="avatar-cone"></div><div class="avatar-disc"><svg viewBox="0 0 20 20"><path fill-rule="evenodd"/></svg></div>'
  return el
}

export function MapStage() {
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    let map: MLMap | null = null
    let alive = true
    let grid: HexGrid | null = null
    let applied: Partial<MapView> = {}
    let avatar: Marker | null = null
    let avatarNode: HTMLDivElement | null = null
    let gotCells = new Set<number>()
    let unsubs: (() => void)[] = []
    let lastFollow = 0
    let ml: typeof import('maplibre-gl') | null = null
    type Target = { center: [number, number]; zoom: number; pitch?: number; bearing?: number }
    let intent: Target | null = null
    let seq = 0
    // anima a câmara e lembra-se do destino até lá chegar: se a folga mudar a meio, o destino mantém-se
    const glide = (t: Target, padding: MapView['pad'], duration: number, easing?: (x: number) => number) => {
      if (!map) return
      const id = ++seq
      intent = t
      map.easeTo(easing ? { ...t, padding, duration, easing } : { ...t, padding, duration })
      map.once('moveend', () => {
        if (seq === id) intent = null
      })
    }

    let painted = ''
    const paintAvatar = () => {
      if (!avatarNode) return
      const g = store.get()
      const a = avatarById(g.avatar?.kind) ?? AVATARS[0]
      const key = `${a.id}|${g.avatar?.ring}`
      if (key === painted && avatarNode.dataset.p === key) return
      painted = key
      avatarNode.dataset.p = key
      avatarNode.style.setProperty('--ring', g.avatar?.ring ?? C.anil)
      avatarNode.querySelector('path')!.setAttribute('d', a.glyph)
    }

    // enquadrar uma área: endireita o mapa (sem inclinação nem rotação) e voa até lá, por cima da folga que já existe
    const fitTo = (b: [[number, number], [number, number]], maxZoom: number, extra: MapView['pad']) => {
      if (!map || !ml) return
      const run = () => {
        if (!map || !ml) return
        const cam = map.cameraForBounds(b, { padding: extra, maxZoom, bearing: 0 })
        if (!cam?.center) return
        const ll = ml.LngLat.convert(cam.center)
        glide({ center: [ll.lng, ll.lat], zoom: cam.zoom ?? map.getZoom(), pitch: 0, bearing: 0 }, mapView.get().pad, reduced() ? 0 : 700)
      }
      if (map.getPitch() > 2 || Math.abs(map.getBearing()) > 1) {
        const id = ++seq
        intent = null
        map.easeTo({ pitch: 0, bearing: 0, duration: reduced() ? 0 : 280 })
        map.once('moveend', () => seq === id && run())
      } else run()
    }

    const syncCells = () => {
      if (!map || !grid || !map.getSource('hex')) return
      const all = store.get().cells
      if (all.length === gotCells.size) return
      for (const i of all) {
        if (!gotCells.has(i)) {
          map.setFeatureState({ source: 'hex', id: i }, { got: true })
          gotCells.add(i)
        }
      }
    }

    const ensureHex = async () => {
      if (!map || map.getSource('hex')) return
      grid = await loadHexGrid()
      if (!map || map.getSource('hex')) return
      map.addSource('hex', { type: 'geojson', data: gridGeoJSON(grid), tolerance: 0.2 })
      const before = map.getLayer('label-contour') ? 'label-contour' : undefined
      map.addLayer({
        id: 'hex-fog',
        type: 'fill',
        source: 'hex',
        paint: { 'fill-color': '#f4f5f7', 'fill-opacity': ['case', ['boolean', ['feature-state', 'got'], false], 0, 0.66] },
        layout: { visibility: 'none' },
      }, before)
      map.addLayer({
        id: 'hex-got',
        type: 'fill',
        source: 'hex',
        paint: { 'fill-color': C.ocre, 'fill-opacity': ['case', ['boolean', ['feature-state', 'got'], false], 0.3, 0] },
        layout: { visibility: 'none' },
      }, before)
      map.addLayer({
        id: 'hex-line',
        type: 'line',
        source: 'hex',
        minzoom: 12.5,
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'got'], false], C.ocreTinta, '#b9bfc8'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 17, 1.2],
          'line-opacity': ['case', ['boolean', ['feature-state', 'got'], false], 0.5, 0.55],
        },
        layout: { visibility: 'none' },
      }, before)
      gotCells = new Set()
      syncCells()
      cellsVis(mapView.get().cells)
    }

    const cellsVis = (cells: MapView['cells']) => {
      if (!map?.getLayer('hex-fog')) return
      map.setLayoutProperty('hex-fog', 'visibility', cells === 'fog' ? 'visible' : 'none')
      map.setLayoutProperty('hex-got', 'visibility', cells === 'off' ? 'none' : 'visible')
      map.setLayoutProperty('hex-line', 'visibility', cells === 'fog' ? 'visible' : 'none')
    }

    const apply = (next: MapView, force = false) => {
      if (!map) return
      const prev = applied
      // folga (a folha e a barra tapam parte do mapa): muda sem o mapa saltar
      if (force || prev.pad !== next.pad) {
        const p = next.pad
        const same = prev.pad && prev.pad.top === p.top && prev.pad.bottom === p.bottom && prev.pad.left === p.left && prev.pad.right === p.right
        if (!same) {
          const cv = map.getCanvas()
          const W = cv.clientWidth
          const H = cv.clientHeight
          if (intent && map.isMoving()) glide(intent, p, reduced() ? 0 : 450)
          else if (force || !prev.pad) map.setPadding(p)
          else {
            const at = map.unproject([(p.left + W - p.right) / 2, (p.top + H - p.bottom) / 2])
            map.jumpTo({ center: at, padding: p })
          }
          box.current?.style.setProperty('--map-b', `${p.bottom}px`)
          box.current?.style.setProperty('--map-l', `${p.left}px`)
        }
      }
      // pontos
      if (force || prev.pois !== next.pois || prev.done !== next.done || prev.inRange !== next.inRange) {
        ;(map.getSource('pois') as GeoJSONSource | undefined)?.setData(poiFC(next.pois, next.done, new Set(next.inRange.map((m) => m.replace(/^m-/, '')))))
      }
      if (force || prev.selected !== next.selected) {
        map.setFilter('poi-selected', ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], next.selected ?? '']])
        if (next.selected && next.mode === 'explore') {
          const p = POIS.find((x) => x.id === next.selected)
          if (p) {
            const dense = p.placeKm < 1 && p.place === 'Serpa'
            const open = ['rio', 'barragem', 'azenha', 'miradouro', 'experiencia'].includes(p.sub)
            glide({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), dense ? 16.4 : open ? 14.4 : 15.6) }, next.pad, reduced() ? 0 : 650)
          }
        }
      }
      // células
      if (force || prev.cells !== next.cells) {
        if (next.cells !== 'off') ensureHex()
        cellsVis(next.cells)
      }
      // percurso
      if (force || prev.track !== next.track) {
        ;(map.getSource('track') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: (next.track ?? [])
            .filter((l) => l.length > 1)
            .map((l) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: l } })),
        })
      }
      // agrupamento só a explorar
      if (force || prev.mode !== next.mode) {
        const explore = next.mode === 'explore'
        map.setLayoutProperty('poi-cluster', 'visibility', explore ? 'visible' : 'none')
        map.setLayoutProperty('poi-cluster-n', 'visibility', explore ? 'visible' : 'none')
        map.setPaintProperty('mask', 'fill-opacity', next.mode === 'record' ? 0.35 : 0.55)
        // ao sair do modo de gravação, o mapa endireita-se (sem cortar uma animação que esteja a decorrer)
        if (!force && next.mode !== 'record' && prev.mode === 'record' && !intent) map.easeTo({ pitch: next.terrain ? 60 : 0, bearing: 0, duration: reduced() ? 0 : 500 })
      }
      // utilizador (ponto azul) e avatar
      if (force || prev.user !== next.user) {
        ;(map.getSource('user') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: next.user ? [{ type: 'Feature', properties: { acc: next.user.acc, dot: next.avatar ? 0 : 1 }, geometry: { type: 'Point', coordinates: [next.user.lon, next.user.lat] } }] : [],
        })
      }
      if (force || prev.avatar !== next.avatar || prev.range !== next.range) {
        if (next.avatar) {
          if (!avatar && ml) {
            avatarNode = avatarEl()
            avatar = new ml.Marker({ element: avatarNode, anchor: 'center', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
              .setLngLat([next.avatar.lon, next.avatar.lat])
              .addTo(map)
          }
          if (avatarNode) {
            paintAvatar()
            const cone = avatarNode.querySelector<HTMLDivElement>('.avatar-cone')!
            cone.style.display = next.avatar.heading === null ? 'none' : 'block'
            cone.style.transform = `rotate(${(next.avatar.heading ?? 0) - map.getBearing()}deg)`
          }
          avatar?.setLngLat([next.avatar.lon, next.avatar.lat])
          ;(map.getSource('range') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [circle(next.avatar.lon, next.avatar.lat, next.range)] })
          if (next.follow) {
            const now = performance.now()
            const walking = (next.range ?? 80) <= 80
            glide(
              { center: [next.avatar.lon, next.avatar.lat], zoom: walking ? 16.6 : 15.4, pitch: 58, bearing: next.avatar.heading ?? map.getBearing() },
              next.pad,
              reduced() ? 0 : Math.min(900, Math.max(180, now - lastFollow)),
              (t) => t,
            )
            lastFollow = now
          }
        } else {
          avatar?.remove()
          avatar = null
          avatarNode = null
          ;(map.getSource('range') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] })
        }
      }
      if (force || prev.terrain !== next.terrain) {
        map.setTerrain(next.terrain ? { source: 'dem', exaggeration: 1.7 } : null)
        if (!force && next.mode !== 'record') {
          if (intent) glide({ ...intent, pitch: next.terrain ? 62 : 0 }, next.pad, reduced() ? 0 : 800)
          else map.easeTo({ pitch: next.terrain ? 62 : 0, duration: reduced() ? 0 : 800 })
        }
      }
      applied = next
    }

    ;(async () => {
      try {
        const [maplibregl, territory] = await Promise.all([import('maplibre-gl'), loadTerritory()])
        if (!alive || !box.current) return
        ml = maplibregl
        setPlaces(territory.places)
        maplibregl.setWorkerUrl(workerUrl)
        map = new maplibregl.Map({
          container: box.current,
          style: buildStyle(territory),
          bounds: SERPA_BOUNDS,
          fitBoundsOptions: { padding: 24 },
          minZoom: 9,
          maxZoom: 18,
          maxBounds: [
            [WIDE[0], WIDE[1]],
            [WIDE[2], WIDE[3]],
          ],
          attributionControl: false,
          locale: { 'AttributionControl.ToggleAttribution': 'Fontes do mapa' },
        })
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
        map.on('error', (e) => {
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
          map.addSource('pois', { type: 'geojson', data: poiFC([], new Set(), new Set()), cluster: true, clusterRadius: 34, clusterMaxZoom: 14, promoteId: 'id' })
          map.addSource('user', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addSource('range', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addSource('track', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addLayer({ id: 'range-fill', type: 'fill', source: 'range', paint: { 'fill-color': C.anil, 'fill-opacity': 0.08 } })
          map.addLayer({ id: 'range-line', type: 'line', source: 'range', paint: { 'line-color': C.anil, 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } })
          map.addLayer({ id: 'track-case', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8 } })
          map.addLayer({ id: 'track', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.anil, 'line-width': 4.5 } })
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
          map.addLayer({ id: 'user-dot', type: 'circle', source: 'user', filter: ['==', ['get', 'dot'], 1], paint: { 'circle-color': C.anil, 'circle-radius': 7, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } })
          map.addLayer({
            id: 'poi-cluster',
            type: 'circle',
            source: 'pois',
            filter: ['has', 'point_count'],
            paint: { 'circle-color': '#000000', 'circle-radius': ['step', ['get', 'point_count'], 15, 6, 18, 15, 21], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 },
          })
          map.addLayer({
            id: 'poi-cluster-n',
            type: 'symbol',
            source: 'pois',
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Archivo Condensed Bold'], 'text-size': 14, 'text-allow-overlap': true },
            paint: { 'text-color': '#fff' },
          })
          map.addLayer({
            id: 'poi-near',
            type: 'circle',
            source: 'pois',
            filter: ['==', ['get', 'near'], 1],
            paint: { 'circle-radius': 24, 'circle-color': 'rgba(242,183,5,0.25)', 'circle-stroke-color': C.ocre, 'circle-stroke-width': 3 },
          })
          map.addLayer({
            id: 'poi-selected',
            type: 'circle',
            source: 'pois',
            filter: ['==', ['get', 'id'], ''],
            paint: { 'circle-radius': 23, 'circle-color': 'rgba(35,72,209,0.12)', 'circle-stroke-color': C.anil, 'circle-stroke-width': 2.5 },
          })
          map.addLayer({
            id: 'poi',
            type: 'symbol',
            source: 'pois',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-allow-overlap': true,
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.82, 15, 1.05],
              'icon-pitch-alignment': 'viewport',
              'text-field': ['step', ['zoom'], '', 15, ['get', 'name']],
              'text-font': ['Archivo Medium'],
              'text-size': 12.5,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-max-width': 9,
              'text-optional': true,
            },
            paint: { 'text-color': '#000000', 'text-halo-color': 'rgba(255,255,255,0.96)', 'text-halo-width': 1.8 },
          })
          map.on('click', 'poi-cluster', async (e) => {
            const f = e.features?.[0] as MapGeoJSONFeature | undefined
            if (!f || !map) return
            const z = await (map.getSource('pois') as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id)
            map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.3 })
          })
          map.on('click', 'poi', (e) => {
            const id = e.features?.[0]?.properties?.id
            if (id) mapView.click(id)
          })
          map.on('click', (e) => {
            const hits = map!.queryRenderedFeatures(e.point, { layers: ['poi', 'poi-cluster'] })
            if (!hits.length) mapView.click(null)
          })
          for (const l of ['poi', 'poi-cluster']) {
            map.on('mouseenter', l, () => (map!.getCanvas().style.cursor = 'pointer'))
            map.on('mouseleave', l, () => (map!.getCanvas().style.cursor = ''))
          }
          map.on('rotate', () => {
            const a = mapView.get().avatar
            const cone = avatarNode?.querySelector<HTMLDivElement>('.avatar-cone')
            if (cone && a) cone.style.transform = `rotate(${(a.heading ?? 0) - map!.getBearing()}deg)`
          })
          apply(mapView.get(), true)
          unsubs.push(mapView.subscribe(() => apply(mapView.get())))
          unsubs.push(store.subscribe(syncCells))
          unsubs.push(store.subscribe(paintAvatar))
          unsubs.push(
            mapView.onCamera((c) => {
              if (!map) return
              if (c.kind === 'fly') glide({ center: [c.lon, c.lat], zoom: c.zoom ?? map.getZoom(), pitch: c.pitch ?? map.getPitch(), bearing: c.bearing ?? map.getBearing() }, mapView.get().pad, reduced() ? 0 : 700)
              if (c.kind === 'fit') fitTo(c.bounds, c.maxZoom ?? 16, { top: 40, bottom: 40, left: 30, right: 30 })
              if (c.kind === 'serpa') fitTo(SERPA_BOUNDS, 13, { top: 24, bottom: 24, left: 24, right: 24 })
            }),
          )
        })
      } catch (err) {
        setFailed(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      alive = false
      unsubs.forEach((u) => u())
      map?.remove()
      map = null
    }
  }, [])

  return (
    <div className="stage" aria-label="Mapa do concelho de Serpa" role="region">
      <div ref={box} className="stage-canvas" />
      {failed && <p className="stage-fail">O mapa não carregou neste browser ({failed}). Precisa de WebGL.</p>}
    </div>
  )
}

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
