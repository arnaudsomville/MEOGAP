import type { SeriesPoint } from './api/client'

export type Hemisphere = 'northern' | 'southern' | 'mixed'
export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export type TemporalFilters = {
  years: number[]
  months: number[]
  seasons: Season[]
}

export const EMPTY_TEMPORAL_FILTERS: TemporalFilters = { years: [], months: [], seasons: [] }

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const SEASON_LABELS: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
}

const NORTHERN_SEASONS: Record<Season, number[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
}

const SOUTHERN_SEASONS: Record<Season, number[]> = {
  winter: [6, 7, 8],
  spring: [9, 10, 11],
  summer: [12, 1, 2],
  autumn: [3, 4, 5],
}

export function hemisphereForLatitudes(latitudes: number[]): Hemisphere {
  const hasNorthern = latitudes.some((latitude) => latitude > 0)
  const hasSouthern = latitudes.some((latitude) => latitude < 0)
  if (hasNorthern && hasSouthern) return 'mixed'
  return hasSouthern ? 'southern' : 'northern'
}

export function seasonForMonth(month: number, hemisphere: Exclude<Hemisphere, 'mixed'>): Season {
  const seasons = hemisphere === 'southern' ? SOUTHERN_SEASONS : NORTHERN_SEASONS
  return (
    (Object.keys(seasons) as Season[]).find((season) => seasons[season].includes(month)) ?? 'winter'
  )
}

export function seriesYear(point: SeriesPoint): number {
  return Number(point.periodStart.slice(0, 4))
}

export function seriesMonth(point: SeriesPoint): number {
  return Number(point.periodStart.slice(5, 7))
}

export function availableYears(points: SeriesPoint[]): number[] {
  return [...new Set(points.map(seriesYear))].sort((left, right) => left - right)
}

export function filterSeriesPoints(
  points: SeriesPoint[],
  filters: TemporalFilters,
  hemisphere: Hemisphere,
): SeriesPoint[] {
  const hasMonthFilter = filters.months.length > 0
  const hasSeasonFilter = filters.seasons.length > 0 && hemisphere !== 'mixed'
  return points.filter((point) => {
    const year = seriesYear(point)
    if (filters.years.length > 0 && !filters.years.includes(year)) return false
    if (!hasMonthFilter && !hasSeasonFilter) return true
    const month = seriesMonth(point)
    const matchesMonth = hasMonthFilter && filters.months.includes(month)
    const matchesSeason =
      hasSeasonFilter && filters.seasons.includes(seasonForMonth(month, hemisphere))
    return matchesMonth || matchesSeason
  })
}

export function isTemporalFilterActive(filters: TemporalFilters): boolean {
  return filters.years.length > 0 || filters.months.length > 0 || filters.seasons.length > 0
}

export function describeTemporalFilters(filters: TemporalFilters): string {
  const groups: string[] = []
  if (filters.years.length) groups.push(`years ${filters.years.join(', ')}`)
  if (filters.months.length) {
    groups.push(
      `months ${filters.months
        .slice()
        .sort((left, right) => left - right)
        .map((month) => MONTH_LABELS[month - 1])
        .join(', ')}`,
    )
  }
  if (filters.seasons.length) {
    groups.push(`seasons ${filters.seasons.map((season) => SEASON_LABELS[season]).join(', ')}`)
  }
  return groups.length ? groups.join(' · ') : 'No temporal filter'
}
