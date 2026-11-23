export type BasemapConfig = {
  name: string
  url: string
  attribution: string
  maxZoom: number
}

export const DEFAULT_BASEMAP: BasemapConfig = {
  name: 'EOxCloudless Sentinel-2 2025',
  url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg',
  attribution:
    '<a href="https://cloudless.eox.at">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)',
  maxZoom: 14,
}

export const DEFAULT_MAP_CENTER: [number, number] = [20, 0]
export const DEFAULT_MAP_ZOOM = 3
