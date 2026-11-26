import { describe, expect, it } from 'vitest'
import {
  formatAreaKm2,
  geometryAreaKm2,
  geometryBounds,
  geometryToPositions,
  geometryToVertices,
  geometryToWkt,
  parseCoordinateQuery,
  parseCoordinates,
  pointInBounds,
  pointInGeometry,
  positionToWktPoint,
  verticesToPolygon,
  verticesAreaKm2,
  verticesToWktPolygon,
  verticesWithinBounds,
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

  it('parses decimal, hemisphere and DMS coordinate queries', { tags: ['unit'] }, () => {
    expect(parseCoordinateQuery('48.8566, 2.3522')).toMatchObject({
      type: 'point',
      lat: 48.8566,
      lng: 2.3522,
      zoom: 13,
    })
    expect(parseCoordinateQuery('48.8566N 2.3522E')).toMatchObject({
      lat: 48.8566,
      lng: 2.3522,
    })
    expect(parseCoordinateQuery('48°51\'24"N 2°21\'08"E')).toMatchObject({
      lat: 48.85666666666667,
      lng: 2.352222222222222,
    })
    expect(parseCoordinateQuery('2.3522E, 48.8566N')).toMatchObject({
      lat: 48.8566,
      lng: 2.3522,
    })
    expect(parseCoordinateQuery('91N 2E')).toBeNull()
    expect(parseCoordinateQuery('paris')).toBeNull()
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

describe('WKT and selection validation', () => {
  const BOUNDS = { south: 43.56, west: 1.38, north: 43.66, east: 1.49 }
  const GEOMETRY = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [1.38, 43.56],
        [1.49, 43.56],
        [1.49, 43.66],
        [1.38, 43.56],
      ],
    ],
  }

  it('converts points and polygons to explicit WKT', { tags: ['unit'] }, () => {
    expect(positionToWktPoint({ lat: 43.6045, lng: 1.4442 })).toBe('POINT(1.4442 43.6045)')
    expect(
      verticesToWktPolygon([
        { lat: 43.6, lng: 1.4 },
        { lat: 43.6, lng: 1.42 },
        { lat: 43.62, lng: 1.42 },
      ]),
    ).toBe('POLYGON((1.4 43.6, 1.42 43.6, 1.42 43.62, 1.4 43.6))')
    expect(verticesToWktPolygon([{ lat: 0, lng: 0 }])).toBeNull()
    expect(geometryToWkt(GEOMETRY)).toContain('POLYGON((')
  })

  it('checks bounds and point-in-geometry containment', { tags: ['unit'] }, () => {
    expect(pointInBounds({ lat: 43.6, lng: 1.44 }, BOUNDS)).toBe(true)
    expect(pointInBounds({ lat: 44, lng: 2 }, BOUNDS)).toBe(false)
    expect(pointInGeometry({ lat: 43.6, lng: 1.44 }, GEOMETRY)).toBe(true)
    expect(pointInGeometry({ lat: 43.7, lng: 1.44 }, GEOMETRY)).toBe(false)
    expect(
      verticesWithinBounds(
        [
          { lat: 43.6, lng: 1.4 },
          { lat: 43.62, lng: 1.42 },
        ],
        BOUNDS,
      ),
    ).toBe(true)
  })

  it('approximates area and rejects degenerate rings', { tags: ['unit'] }, () => {
    expect(geometryAreaKm2(GEOMETRY)).toBeGreaterThan(40)
    expect(
      geometryAreaKm2({
        type: 'Polygon',
        coordinates: [
          [
            [1.4, 43.6],
            [1.42, 43.6],
            [1.42, 43.62],
            [1.4, 43.6],
          ],
        ],
      }),
    ).toBeGreaterThan(0)
    expect(
      geometryAreaKm2({
        type: 'Polygon',
        coordinates: [
          [
            [1.4, 43.6],
            [1.4, 43.6],
          ],
        ],
      }),
    ).toBe(0)
  })
})

describe('area formatting for drafting', () => {
  it('computes and formats drafted polygon areas', { tags: ['unit'] }, () => {
    const vertices = [
      { lat: 43.6, lng: 1.4 },
      { lat: 43.6, lng: 1.42 },
      { lat: 43.62, lng: 1.42 },
    ]
    expect(verticesAreaKm2(vertices)).toBeGreaterThan(0)
    expect(verticesAreaKm2(vertices.slice(0, 2))).toBeNull()
    expect(formatAreaKm2(12.345)).toBe('12.35 km²')
    expect(formatAreaKm2(150.4)).toBe('150 km²')
  })
})
