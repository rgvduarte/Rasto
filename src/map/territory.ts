// Concelho, freguesias, máscara e povoações (public/data/territory.json, gerado por scripts/geo/build_layers.py)
import { siteBase } from './style'
import type { TerritoryGeo } from './style'

export type TerritoryData = TerritoryGeo & {
  places: { name: string; lat: number; lon: number; rank: number; inSerpa: boolean }[]
}

let p: Promise<TerritoryData> | null = null
export function loadTerritory(): Promise<TerritoryData> {
  if (!p) {
    p = fetch(`${siteBase()}data/territory.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`territory.json ${r.status}`)
        return r.json()
      })
      .then((d) => ({ mask: d.mask, freguesias: d.freguesias, places: d.places }))
  }
  return p
}
