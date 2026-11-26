import type { Aoi } from '../api/client'
import type { IconName } from '../components/Icon'
import type { MapFocus } from '../map/coordinates'
import { parseCoordinates } from '../map/coordinates'
import { searchPlaces } from '../map/places'

export type SearchSuggestion = {
  id: string
  kind: 'coordinate' | 'aoi' | 'place'
  label: string
  detail: string
  icon: IconName
  focus?: MapFocus
  aoiId?: string
}

export function buildSearchSuggestions(query: string, aois: Aoi[], limit = 8): SearchSuggestion[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const suggestions: SearchSuggestion[] = []
  const coordinates = parseCoordinates(trimmed)
  if (coordinates && coordinates.type === 'point') {
    suggestions.push({
      id: 'coordinate',
      kind: 'coordinate',
      label: `${coordinates.lat}, ${coordinates.lng}`,
      detail: 'Geographic coordinates',
      icon: 'map-pin',
      focus: coordinates,
    })
  }
  const normalized = trimmed.toLowerCase()
  const matchingAois = aois
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
  const matchingPlaces = searchPlaces(trimmed, 5).map<SearchSuggestion>((place) => ({
    id: `place-${place.id}`,
    kind: 'place',
    label: place.name,
    detail: `${place.region} · Place`,
    icon: 'compass',
    focus: { type: 'point', lat: place.lat, lng: place.lng, zoom: 10 },
  }))
  return [...suggestions, ...matchingAois, ...matchingPlaces].slice(0, limit)
}
