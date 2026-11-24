export type BasemapId = 'satellite' | 'openstreetmap'

export type BasemapConfig = {
  id: BasemapId
  name: string
  shortName: string
  url: string
  attribution: string
  maxZoom: number
  maxNativeZoom?: number
}

export const DEFAULT_BASEMAP: BasemapConfig = {
  id: 'satellite',
  name: 'EOxCloudless Sentinel-2 2025',
  shortName: 'Satellite',
  url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg',
  attribution:
    '<a href="https://cloudless.eox.at">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)',
  maxZoom: 19,
  maxNativeZoom: 14,
}

export const OPENSTREETMAP_BASEMAP: BasemapConfig = {
  id: 'openstreetmap',
  name: 'OpenStreetMap',
  shortName: 'OSM',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}

export const BASEMAPS: Record<BasemapId, BasemapConfig> = {
  satellite: DEFAULT_BASEMAP,
  openstreetmap: OPENSTREETMAP_BASEMAP,
}

export const BASEMAP_MAX_ZOOM = Math.max(DEFAULT_BASEMAP.maxZoom, OPENSTREETMAP_BASEMAP.maxZoom)
export const DEFAULT_MAP_CENTER: [number, number] = [20, 0]
export const DEFAULT_MAP_ZOOM = 3
