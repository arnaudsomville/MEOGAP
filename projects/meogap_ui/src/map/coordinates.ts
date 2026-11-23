import type { AoiGeometry, Position } from '../api/client'

export type MapFocus = Position & { zoom?: number }
export type MapPosition = [number, number]
export type MapPolygon = MapPosition[][] | MapPosition[][][]

export function parseCoordinates(value: string): MapFocus | null {
  const parts = value.trim().split(/[ ,]+/)
  if (parts.length !== 2) return null
  const [lat, lng] = parts.map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null
  }
  return { lat, lng, zoom: 12 }
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
