import type { Aoi, PlaceSuggestion } from '../api/client'
import type { IconName } from '../components/Icon'
import type { MapFocus } from '../map/coordinates'
import { parseCoordinateQuery } from '../map/coordinates'

export type SearchSuggestion = {
  id: string
  kind: 'coordinate' | 'aoi' | 'place'
  label: string
  detail: string
  icon: IconName
  focus?: MapFocus
  aoiId?: string
}

export function buildSearchSuggestions(
  query: string,
  aois: Aoi[],
  places: PlaceSuggestion[] = [],
  limit = 10,
): SearchSuggestion[] {
  const trimmed = query.trim()
  const suggestions: SearchSuggestion[] = []
  if (trimmed) {
    const coordinates = parseCoordinateQuery(trimmed)
    if (coordinates && coordinates.type === 'point') {
      suggestions.push({
        id: 'coordinate',
        kind: 'coordinate',
        label: `${coordinates.lat}, ${coordinates.lng}`,
        detail: 'Geographic coordinates · EPSG:4326',
        icon: 'map-pin',
        focus: coordinates,
      })
    }
  }
  const normalized = trimmed.toLowerCase()
  const matchingAois = normalized
    ? aois
        .filter((aoi) => aoi.name.toLowerCase().includes(normalized))
        .slice(0, 4)
        .map<SearchSuggestion>((aoi) => ({
          id: `aoi-${aoi.id}`,
          kind: 'aoi',
          label: aoi.name,
          detail: `Saved AOI · Revision ${aoi.revision}`,
          icon: 'layers',
          aoiId: aoi.id,
        }))
    : []
  const matchingPlaces = places.map<SearchSuggestion>((place) => ({
    id: `place-${place.placeId}`,
    kind: 'place',
    label: place.name,
    detail: placeDetail(place),
    icon: 'compass',
    focus: {
      type: 'point',
      lat: place.latitude,
      lng: place.longitude,
      zoom: zoomForPopulation(place.population),
    },
  }))
  return [...suggestions, ...matchingAois, ...matchingPlaces].slice(0, limit)
}

function placeDetail(place: PlaceSuggestion): string {
  const location = [place.admin1, place.country].filter(Boolean).join(', ')
  const population = formatPopulation(place.population)
  return population ? `${location} · ${population}` : location
}

function formatPopulation(population: number): string {
  if (population <= 0) return ''
  if (population >= 1_000_000) return `${(population / 1_000_000).toFixed(1)}M inhabitants`
  if (population >= 1_000) return `${Math.round(population / 1_000)}k inhabitants`
  return `${population} inhabitants`
}

function zoomForPopulation(population: number): number {
  if (population >= 2_000_000) return 9
  if (population >= 500_000) return 10
  if (population >= 100_000) return 11
  if (population >= 10_000) return 12
  return 13
}
