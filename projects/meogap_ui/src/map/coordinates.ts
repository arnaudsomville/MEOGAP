import type { AoiGeometry, Position } from '../api/client'

const MIN_RING_POSITIONS = 4

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

export function pointInBounds(position: Position, bounds: MapBounds): boolean {
  return (
    position.lat >= bounds.south &&
    position.lat <= bounds.north &&
    position.lng >= bounds.west &&
    position.lng <= bounds.east
  )
}

function pointInRing(longitude: number, latitude: number, ring: number[][]): boolean {
  let inside = false
  let previousLongitude = ring[ring.length - 1][0]
  let previousLatitude = ring[ring.length - 1][1]
  for (const [currentLongitude, currentLatitude] of ring) {
    const crosses = currentLatitude > latitude !== previousLatitude > latitude
    if (crosses) {
      const intersection =
        ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
        currentLongitude
      if (longitude < intersection) inside = !inside
    }
    previousLongitude = currentLongitude
    previousLatitude = currentLatitude
  }
  return inside
}

export function pointInGeometry(position: Position, geometry: AoiGeometry): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.some(
    (polygon) =>
      polygon.length > 0 && pointInRing(position.lng, position.lat, polygon[0] as number[][]),
  )
}

export function verticesWithinBounds(vertices: Position[], bounds: MapBounds): boolean {
  return vertices.every((vertex) => pointInBounds(vertex, bounds))
}

function formatCoordinate(value: number): string {
  return Number.isInteger(value) ? value.toFixed(6).replace(/\.?0+$/, '') : String(value)
}

export function positionToWktPoint(position: Position): string {
  return `POINT(${formatCoordinate(position.lng)} ${formatCoordinate(position.lat)})`
}

function ringToWkt(ring: number[][]): string {
  const coordinates = ring.map(
    ([longitude, latitude]) => `${formatCoordinate(longitude)} ${formatCoordinate(latitude)}`,
  )
  return `(${coordinates.join(', ')})`
}

export function verticesToWktPolygon(vertices: Position[]): string | null {
  if (vertices.length < 3) return null
  const ring = vertices.map(positionToCoordinates)
  ring.push([...ring[0]])
  return `POLYGON((${ring
    .map(([longitude, latitude]) => `${formatCoordinate(longitude)} ${formatCoordinate(latitude)}`)
    .join(', ')}))`
}

export function geometryToWkt(geometry: AoiGeometry): string {
  if (geometry.type === 'Polygon') {
    return `POLYGON(${geometry.coordinates.map(ringToWkt).join(', ')})`
  }
  return `MULTIPOLYGON(${geometry.coordinates
    .map((polygon) => `(${polygon.map(ringToWkt).join(', ')})`)
    .join(', ')})`
}

export function verticesAreaKm2(vertices: Position[]): number | null {
  const geometry = verticesToPolygon(vertices)
  return geometry ? geometryAreaKm2(geometry) : null
}

export function formatAreaKm2(area: number): string {
  return `${area >= 100 ? area.toFixed(0) : area.toFixed(2)} km²`
}

export function geometryAreaKm2(geometry: AoiGeometry): number {
  const rings =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.coordinates.flatMap((polygon) => polygon)
  let total = 0
  for (const ring of rings) {
    if (ring.length < MIN_RING_POSITIONS) continue
    const positions = ring.map(([longitude, latitude]) => ({ longitude, latitude }))
    const meanLatitude =
      positions.reduce((sum, position) => sum + position.latitude, 0) / positions.length
    const longitudeScale = 111_320 * Math.cos((meanLatitude * Math.PI) / 180)
    const latitudeScale = 110_540
    const projected = positions.map((position) => [
      position.longitude * longitudeScale,
      position.latitude * latitudeScale,
    ])
    let area = 0
    for (let index = 0; index < projected.length - 1; index += 1) {
      area +=
        projected[index][0] * projected[index + 1][1] -
        projected[index + 1][0] * projected[index][1]
    }
    total += Math.abs(area) / 2
  }
  return total / 1_000_000
}
