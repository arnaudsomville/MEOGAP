import { describe, expect, it } from 'vitest'
import {
  geometryBounds,
  geometryToPositions,
  geometryToVertices,
  parseCoordinates,
  verticesToPolygon,
} from '../../src/map/coordinates'

describe('map coordinates', () => {
  it('parses valid latitude longitude input and rejects invalid values', { tags: ['unit'] }, () => {
    expect(parseCoordinates('48.8566, 2.3522')).toEqual({
      type: 'point',
      lat: 48.8566,
      lng: 2.3522,
      zoom: 12,
    })
    expect(parseCoordinates('91, 2')).toBeNull()
    expect(parseCoordinates('paris')).toBeNull()
  })

  it('converts drawn vertices into a closed GeoJSON polygon', { tags: ['unit'] }, () => {
    expect(
      verticesToPolygon([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
        { lat: 5, lng: 6 },
      ]),
    ).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [2, 1],
          [4, 3],
          [6, 5],
          [2, 1],
        ],
      ],
    })
    expect(verticesToPolygon([{ lat: 1, lng: 2 }])).toBeNull()
  })

  it(
    'converts GeoJSON positions back to map positions and editable vertices',
    { tags: ['unit'] },
    () => {
      const geometry = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [2, 1],
            [4, 3],
            [2, 1],
          ],
        ],
      }
      expect(geometryToPositions(geometry)).toEqual([
        [
          [1, 2],
          [3, 4],
          [1, 2],
        ],
      ])
      expect(geometryToVertices(geometry)).toEqual([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ])
    },
  )

  it(
    'preserves multipolygon grouping and handles an unclosed single-point exterior',
    { tags: ['unit'] },
    () => {
      const multiPolygon = {
        type: 'MultiPolygon' as const,
        coordinates: [
          [
            [
              [2, 1],
              [4, 3],
              [2, 1],
            ],
          ],
        ],
      }
      expect(geometryToPositions(multiPolygon)).toEqual([
        [
          [
            [1, 2],
            [3, 4],
            [1, 2],
          ],
        ],
      ])
      expect(geometryToVertices(multiPolygon)).toEqual([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ])
      expect(geometryToVertices({ type: 'Polygon', coordinates: [[[2, 1]]] })).toEqual([
        { lat: 1, lng: 2 },
      ])
    },
  )

  it('computes complete bounds for Polygon and MultiPolygon geometries', { tags: ['unit'] }, () => {
    expect(
      geometryBounds({
        type: 'Polygon',
        coordinates: [
          [
            [1.38, 43.56],
            [1.49, 43.56],
            [1.49, 43.66],
            [1.38, 43.66],
            [1.38, 43.56],
          ],
        ],
      }),
    ).toEqual({ south: 43.56, west: 1.38, north: 43.66, east: 1.49 })

    expect(
      geometryBounds({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-85, 10.35],
              [-84.9, 10.35],
              [-84.9, 10.4],
              [-85, 10.35],
            ],
          ],
          [
            [
              [-84.82, 10.45],
              [-84.7, 10.45],
              [-84.7, 10.5],
              [-84.82, 10.45],
            ],
          ],
        ],
      }),
    ).toEqual({ south: 10.35, west: -85, north: 10.5, east: -84.7 })
  })

  it('returns null for empty or invalid geometries', { tags: ['unit'] }, () => {
    expect(geometryBounds({ type: 'Polygon', coordinates: [[]] })).toBeNull()
    expect(
      geometryBounds({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [Number.NaN, 1],
              [200, 1],
            ],
          ],
        ],
      }),
    ).toBeNull()
  })
})
