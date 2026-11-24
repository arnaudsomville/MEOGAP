import { describe, expect, it } from 'vitest'
import { searchPlaces } from '../../src/map/places'

describe('geographic place index', () => {
  it('ranks exact and prefix place names before incidental matches', { tags: ['unit'] }, () => {
    expect(searchPlaces('toulouse')[0]?.id).toBe('toulouse')
    expect(searchPlaces('lond')[0]?.id).toBe('london')
    expect(searchPlaces('Lyon')[0]?.id).toBe('lyon')
  })

  it('normalizes accents and matches regions', { tags: ['unit'] }, () => {
    expect(searchPlaces('sao')[0]?.id).toBe('sao-paulo')
    expect(searchPlaces('france').every((place) => place.region === 'France')).toBe(true)
    expect(searchPlaces('france').length).toBeGreaterThan(1)
  })

  it('returns no results for an empty query and respects the limit', { tags: ['unit'] }, () => {
    expect(searchPlaces('   ')).toEqual([])
    expect(searchPlaces('a', 3)).toHaveLength(3)
  })
})
