import { describe, expect, it } from 'vitest'
import type { SeriesPoint } from '../src/api/client'
import {
  availableYears,
  describeTemporalFilters,
  EMPTY_TEMPORAL_FILTERS,
  filterSeriesPoints,
  hemisphereForLatitudes,
  isTemporalFilterActive,
  seasonForMonth,
  seriesMonth,
  seriesYear,
} from '../src/temporal'

function point(periodStart: string, value: number | null = 0.5): SeriesPoint {
  return {
    parameter: 'ndvi',
    periodStart,
    periodEnd: periodStart,
    value,
    unit: 'unitless',
    state: value === null ? 'MISSING' : 'VALID',
    qualityStatus: value === null ? 'UNKNOWN' : 'VALID',
    coverage: null,
    note: null,
  }
}

const POINTS = [
  point('2025-01-01'),
  point('2025-02-01'),
  point('2025-06-01'),
  point('2025-12-01'),
  point('2026-01-01'),
  point('2026-07-01'),
]

describe('temporal display filters', () => {
  it('derives the hemisphere from selected latitudes', { tags: ['unit'] }, () => {
    expect(hemisphereForLatitudes([10, 20])).toBe('northern')
    expect(hemisphereForLatitudes([-10, -20])).toBe('southern')
    expect(hemisphereForLatitudes([-1, 1])).toBe('mixed')
  })

  it('uses explicit meteorological seasons per hemisphere', { tags: ['unit'] }, () => {
    expect(seasonForMonth(1, 'northern')).toBe('winter')
    expect(seasonForMonth(1, 'southern')).toBe('summer')
    expect(seasonForMonth(7, 'northern')).toBe('summer')
    expect(seasonForMonth(7, 'southern')).toBe('winter')
  })

  it('exposes period years and months', { tags: ['unit'] }, () => {
    expect(seriesYear(POINTS[0])).toBe(2025)
    expect(seriesMonth(POINTS[2])).toBe(6)
    expect(availableYears(POINTS)).toEqual([2025, 2026])
  })

  it('returns all periods when no filter is active', { tags: ['unit'] }, () => {
    expect(filterSeriesPoints(POINTS, EMPTY_TEMPORAL_FILTERS, 'northern')).toEqual(POINTS)
    expect(isTemporalFilterActive(EMPTY_TEMPORAL_FILTERS)).toBe(false)
    expect(describeTemporalFilters(EMPTY_TEMPORAL_FILTERS)).toBe('No temporal filter')
  })

  it('combines month and season filters inclusively', { tags: ['unit'] }, () => {
    const filtered = filterSeriesPoints(
      POINTS,
      { years: [], months: [1], seasons: ['summer'] },
      'northern',
    )
    expect(filtered.map((item) => item.periodStart)).toEqual([
      '2025-01-01',
      '2025-06-01',
      '2026-01-01',
      '2026-07-01',
    ])
    expect(isTemporalFilterActive({ years: [], months: [1], seasons: [] })).toBe(true)
    expect(describeTemporalFilters({ years: [2025], months: [1], seasons: ['summer'] })).toContain(
      'years 2025',
    )
  })

  it('filters by year and ignores seasons across the equator', { tags: ['unit'] }, () => {
    const filtered = filterSeriesPoints(
      POINTS,
      { years: [2026], months: [], seasons: ['winter'] },
      'mixed',
    )
    expect(filtered.map((item) => item.periodStart)).toEqual(['2026-01-01', '2026-07-01'])
  })
})
