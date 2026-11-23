import { useEffect } from 'react'
import { ImageOverlay, MapContainer, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Aoi, Position, ResultMap } from '../api/client'
import { geometryToPositions, type MapFocus } from './coordinates'

export type MapSurfaceProps = {
  aois: Aoi[]
  draftVertices: Position[]
  drawing: boolean
  focus: MapFocus | null
  resultMap: ResultMap | null
  selectedAoiId: string | null
  onMapClick: (position: Position) => void
  onAoiSelect: (id: string) => void
}

export type MapSurfaceComponent = (props: MapSurfaceProps) => React.JSX.Element

const DEFAULT_CENTER: [number, number] = [20, 0]
const DEFAULT_ZOOM = 3
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function MapClickHandler({ drawing, onMapClick }: Pick<MapSurfaceProps, 'drawing' | 'onMapClick'>) {
  useMapEvents({
    click(event) {
      if (drawing) onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function FocusHandler({ focus }: Pick<MapSurfaceProps, 'focus'>) {
  const map = useMap()
  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], focus.zoom ?? DEFAULT_ZOOM)
      return
    }
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
  }, [focus, map])
  return null
}

export function LeafletMapSurface({
  aois,
  draftVertices,
  drawing,
  focus,
  resultMap,
  selectedAoiId,
  onMapClick,
  onAoiSelect,
}: MapSurfaceProps) {
  return (
    <section className="map-region" aria-label="Interactive OpenStreetMap">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="leaflet-map"
        zoomControl={false}
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
        <MapClickHandler drawing={drawing} onMapClick={onMapClick} />
        <FocusHandler focus={focus} />
        {aois.map((aoi) => (
          <Polygon
            key={aoi.id}
            positions={geometryToPositions(aoi.geometry)}
            pathOptions={{ color: aoi.id === selectedAoiId ? '#4ce0c1' : '#e7c56a', weight: 2 }}
            eventHandlers={{ click: () => onAoiSelect(aoi.id) }}
          />
        ))}
        {draftVertices.length > 1 ? (
          <Polygon
            positions={draftVertices.map(
              (position) => [position.lat, position.lng] as [number, number],
            )}
            pathOptions={{ color: '#ffdf76', dashArray: '5 7', fillOpacity: 0.12 }}
          />
        ) : null}
        {resultMap?.bounds ? (
          <ImageOverlay
            url={resultMap.url}
            bounds={
              resultMap.bounds.map((point) => [point.lat, point.lng]) as [
                [number, number],
                [number, number],
              ]
            }
            opacity={0.75}
          />
        ) : null}
      </MapContainer>
    </section>
  )
}
