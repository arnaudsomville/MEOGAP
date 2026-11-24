export type GeographicPlace = {
  id: string
  name: string
  region: string
  lat: number
  lng: number
}

export const DEMO_PLACES: GeographicPlace[] = [
  { id: 'toulouse', name: 'Toulouse', region: 'France', lat: 43.6045, lng: 1.4442 },
  { id: 'paris', name: 'Paris', region: 'France', lat: 48.8566, lng: 2.3522 },
  { id: 'lyon', name: 'Lyon', region: 'France', lat: 45.764, lng: 4.8357 },
  { id: 'marseille', name: 'Marseille', region: 'France', lat: 43.2965, lng: 5.3698 },
  { id: 'bordeaux', name: 'Bordeaux', region: 'France', lat: 44.8378, lng: -0.5792 },
  { id: 'london', name: 'London', region: 'United Kingdom', lat: 51.5072, lng: -0.1276 },
  { id: 'berlin', name: 'Berlin', region: 'Germany', lat: 52.52, lng: 13.405 },
  { id: 'madrid', name: 'Madrid', region: 'Spain', lat: 40.4168, lng: -3.7038 },
  { id: 'rome', name: 'Rome', region: 'Italy', lat: 41.9028, lng: 12.4964 },
  { id: 'lisbon', name: 'Lisbon', region: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { id: 'amsterdam', name: 'Amsterdam', region: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { id: 'brussels', name: 'Brussels', region: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { id: 'geneva', name: 'Geneva', region: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { id: 'vienna', name: 'Vienna', region: 'Austria', lat: 48.2082, lng: 16.3738 },
  { id: 'copenhagen', name: 'Copenhagen', region: 'Denmark', lat: 55.6761, lng: 12.5683 },
  { id: 'stockholm', name: 'Stockholm', region: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { id: 'oslo', name: 'Oslo', region: 'Norway', lat: 59.9139, lng: 10.7522 },
  { id: 'helsinki', name: 'Helsinki', region: 'Finland', lat: 60.1699, lng: 24.9384 },
  { id: 'reykjavik', name: 'Reykjavik', region: 'Iceland', lat: 64.1466, lng: -21.9426 },
  { id: 'new-york', name: 'New York', region: 'United States', lat: 40.7128, lng: -74.006 },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    region: 'United States',
    lat: 37.7749,
    lng: -122.4194,
  },
  { id: 'washington', name: 'Washington', region: 'United States', lat: 38.9072, lng: -77.0369 },
  { id: 'vancouver', name: 'Vancouver', region: 'Canada', lat: 49.2827, lng: -123.1207 },
  { id: 'mexico-city', name: 'Mexico City', region: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { id: 'sao-paulo', name: 'Sao Paulo', region: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { id: 'rio-de-janeiro', name: 'Rio de Janeiro', region: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { id: 'buenos-aires', name: 'Buenos Aires', region: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { id: 'santiago', name: 'Santiago', region: 'Chile', lat: -33.4489, lng: -70.6693 },
  { id: 'lima', name: 'Lima', region: 'Peru', lat: -12.0464, lng: -77.0428 },
  { id: 'bogota', name: 'Bogota', region: 'Colombia', lat: 4.711, lng: -74.0721 },
  { id: 'cajamarca', name: 'Cajamarca', region: 'Peru', lat: -7.1638, lng: -78.5003 },
  { id: 'guanacaste', name: 'Guanacaste', region: 'Costa Rica', lat: 10.5, lng: -85 },
  { id: 'nairobi', name: 'Nairobi', region: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { id: 'johannesburg', name: 'Johannesburg', region: 'South Africa', lat: -26.2041, lng: 28.0473 },
  { id: 'cape-town', name: 'Cape Town', region: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { id: 'cairo', name: 'Cairo', region: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { id: 'marrakesh', name: 'Marrakesh', region: 'Morocco', lat: 31.6295, lng: -7.9811 },
  { id: 'dubai', name: 'Dubai', region: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { id: 'mumbai', name: 'Mumbai', region: 'India', lat: 19.076, lng: 72.8777 },
  { id: 'delhi', name: 'Delhi', region: 'India', lat: 28.6139, lng: 77.209 },
  { id: 'beijing', name: 'Beijing', region: 'China', lat: 39.9042, lng: 116.4074 },
  { id: 'tokyo', name: 'Tokyo', region: 'Japan', lat: 35.6762, lng: 139.6503 },
  { id: 'singapore', name: 'Singapore', region: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { id: 'sydney', name: 'Sydney', region: 'Australia', lat: -33.8688, lng: 151.2093 },
  { id: 'melbourne', name: 'Melbourne', region: 'Australia', lat: -37.8136, lng: 144.9631 },
  { id: 'anchorage', name: 'Anchorage', region: 'United States', lat: 61.2181, lng: -149.9003 },
]

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function matchScore(place: GeographicPlace, query: string): number {
  const name = normalize(place.name)
  const region = normalize(place.region)
  if (name === query) return 0
  if (name.startsWith(query)) return 1
  if (name.includes(query)) return 2
  if (region.startsWith(query)) return 3
  if (region.includes(query)) return 4
  return Number.POSITIVE_INFINITY
}

export function searchPlaces(query: string, limit = 5): GeographicPlace[] {
  const normalized = normalize(query)
  if (!normalized) return []
  return DEMO_PLACES.map((place) => ({ place, score: matchScore(place, normalized) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort(
      (left, right) => left.score - right.score || left.place.name.localeCompare(right.place.name),
    )
    .slice(0, limit)
    .map((entry) => entry.place)
}
