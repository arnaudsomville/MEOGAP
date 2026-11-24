import { useEffect } from 'react'
import {
  ImageOverlay,
  MapContainer,
  Polygon,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Aoi, Position, ResultMap } from '../api/client'
import { DEFAULT_BASEMAP, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './basemap'
import { geometryToPositions, type MapFocus } from './coordinates'

export type MapSurfaceProps = {
  aois: Aoi[]
  draftVertices: Position[]
  drawing: boolean
  focus: MapFocus | null
  focusRevision: number
  resultMap: ResultMap | null
  selectedAoiId: string | null
  onMapClick: (position: Position) => void
  onAoiSelect: (id: string) => void
}

export type MapSurfaceComponent = (props: MapSurfaceProps) => React.JSX.Element

const DEFAULT_FIT_MAX_ZOOM = 14

function MapClickHandler({ drawing, onMapClick }: Pick<MapSurfaceProps, 'drawing' | 'onMapClick'>) {
  useMapEvents({
    click(event) {
      if (drawing) onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function ViewHandler({ focus, focusRevision }: Pick<MapSurfaceProps, 'focus' | 'focusRevision'>) {
  const map = useMap()
  useEffect(() => {
    if (focus === null) {
      map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM)
      return
    }
    if (focus.type === 'bounds') {
      map.fitBounds(
        [
          [focus.bounds.south, focus.bounds.west],
          [focus.bounds.north, focus.bounds.east],
        ],
        {
          maxZoom: focus.maxZoom ?? DEFAULT_FIT_MAX_ZOOM,
          paddingTopLeft: focus.paddingTopLeft,
          paddingBottomRight: focus.paddingBottomRight,
        },
      )
      return
    }
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? DEFAULT_MAP_ZOOM)
  }, [focus, focusRevision, map])
  return null
}

export function LeafletMapSurface({
  aois,
  draftVertices,
  drawing,
  focus,
  focusRevision,
  resultMap,
  selectedAoiId,
  onMapClick,
  onAoiSelect,
}: MapSurfaceProps) {
  return (
    <section className="map-region" aria-label="Interactive basemap">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        maxZoom={DEFAULT_BASEMAP.maxZoom}
        className="leaflet-map"
        zoomControl={false}
      >
        <TileLayer
          url={DEFAULT_BASEMAP.url}
          attribution={DEFAULT_BASEMAP.attribution}
          maxZoom={DEFAULT_BASEMAP.maxZoom}
        />
        <ScaleControl imperial={false} maxWidth={120} position="bottomright" />
        <MapClickHandler drawing={drawing} onMapClick={onMapClick} />
        <ViewHandler focus={focus} focusRevision={focusRevision} />
        {aois.map((aoi) => (
          <Polygon
            key={aoi.id}
            positions={geometryToPositions(aoi.geometry)}
            pathOptions={
              aoi.id === selectedAoiId
                ? { color: '#55e3d1', weight: 2.5, fillOpacity: 0.14 }
                : { color: '#79b77a', weight: 1.5, fillOpacity: 0.06 }
            }
            eventHandlers={{ click: () => onAoiSelect(aoi.id) }}
          />
        ))}
        {draftVertices.length > 1 ? (
          <Polygon
            positions={draftVertices.map(
              (position) => [position.lat, position.lng] as [number, number],
            )}
            pathOptions={{ color: '#55e3d1', dashArray: '5 7', fillOpacity: 0.12 }}
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
