import type { AoiGeometry, Position } from '../api/client'

export type MapBounds = {
  south: number
  west: number
  north: number
  east: number
}

export type PointFocus = Position & { type: 'point'; zoom?: number }

export type BoundsFocus = {
  type: 'bounds'
  bounds: MapBounds
  maxZoom?: number
  paddingTopLeft?: [number, number]
  paddingBottomRight?: [number, number]
}

export type MapFocus = PointFocus | BoundsFocus
export type MapPosition = [number, number]
export type MapPolygon = MapPosition[][] | MapPosition[][][]

export function parseCoordinates(value: string): MapFocus | null {
  const parts = value.trim().split(/[ ,]+/)
  if (parts.length !== 2) return null
  const [lat, lng] = parts.map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null
  }
  return { type: 'point', lat, lng, zoom: 12 }
}

export function positionToCoordinates(position: Position): number[] {
  return [position.lng, position.lat]
}

export function verticesToPolygon(vertices: Position[]): AoiGeometry | null {
  if (vertices.length < 3) return null
  const ring = vertices.map(positionToCoordinates)
  ring.push([...ring[0]])
  return { type: 'Polygon', coordinates: [ring] }
}

export function geometryToPositions(geometry: AoiGeometry): MapPolygon {
  const convertRing = (ring: number[][]): MapPosition[] => ring.map(([lng, lat]) => [lat, lng])
  if (geometry.type === 'Polygon') return geometry.coordinates.map(convertRing)
  return geometry.coordinates.map((polygon) => polygon.map(convertRing))
}

export function geometryToVertices(geometry: AoiGeometry): Position[] {
  const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates[0]
  const exterior = rings[0] ?? []
  const positions = exterior.map(([lng, lat]) => ({ lat, lng }))
  if (positions.length > 1) {
    const first = positions[0]
    const last = positions[positions.length - 1]
    if (first.lat === last.lat && first.lng === last.lng) positions.pop()
  }
  return positions
}

function forEachPosition(
  geometry: AoiGeometry,
  visit: (latitude: number, longitude: number) => void,
): void {
  const visitRing = (ring: number[][]) => {
    for (const position of ring) {
      if (!Array.isArray(position) || position.length < 2) continue
      const [longitude, latitude] = position
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue
      visit(latitude, longitude)
    }
  }
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) visitRing(ring)
    return
  }
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) visitRing(ring)
  }
}

export function geometryBounds(geometry: AoiGeometry): MapBounds | null {
  let south = Number.POSITIVE_INFINITY
  let west = Number.POSITIVE_INFINITY
  let north = Number.NEGATIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  let count = 0

  forEachPosition(geometry, (latitude, longitude) => {
    count += 1
    south = Math.min(south, latitude)
    west = Math.min(west, longitude)
    north = Math.max(north, latitude)
    east = Math.max(east, longitude)
  })

  if (count === 0) return null
  return { south, west, north, east }
}
