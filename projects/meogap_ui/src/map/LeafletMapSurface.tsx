import { useEffect, useState } from 'react'
import {
  CircleMarker,
  ImageOverlay,
  MapContainer,
  Polygon,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Aoi, Position, ResultMap } from '../api/client'
import { Icon } from '../components/Icon'
import {
  BASEMAPS,
  BASEMAP_MAX_ZOOM,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  type BasemapId,
} from './basemap'
import { formatAreaKm2, geometryToPositions, verticesAreaKm2, type MapFocus } from './coordinates'

export type SelectionMode = 'none' | 'point' | 'polygon'

export type MapSurfaceProps = {
  aois: Aoi[]
  draftVertices: Position[]
  drawing: boolean
  focus: MapFocus | null
  focusRevision: number
  resultMap: ResultMap | null
  resultVisible: boolean
  selectionMode: SelectionMode
  selectionPoint: Position | null
  selectionVertices: Position[]
  selectedAoiId: string | null
  onMapClick: (position: Position) => void
  onResultClick: (position: Position) => void
  onAoiSelect: (id: string) => void
}

export type MapSurfaceComponent = (props: MapSurfaceProps) => React.JSX.Element

const DEFAULT_FIT_MAX_ZOOM = 14

function MapClickHandler({
  drawing,
  resultMap,
  selectionMode,
  onMapClick,
  onResultClick,
}: Pick<
  MapSurfaceProps,
  'drawing' | 'resultMap' | 'selectionMode' | 'onMapClick' | 'onResultClick'
>) {
  useMapEvents({
    click(event) {
      const position = { lat: event.latlng.lat, lng: event.latlng.lng }
      if (drawing) {
        onMapClick(position)
        return
      }
      if (resultMap && selectionMode !== 'none') onResultClick(position)
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
  resultVisible,
  selectionMode,
  selectionPoint,
  selectionVertices,
  selectedAoiId,
  onMapClick,
  onResultClick,
  onAoiSelect,
}: MapSurfaceProps) {
  const [basemapId, setBasemapId] = useState<BasemapId>('satellite')
  const basemap = BASEMAPS[basemapId]
  const draftAreaKm2 = verticesAreaKm2(draftVertices)
  const selectionAreaKm2 = verticesAreaKm2(selectionVertices)
  const nextBasemap = BASEMAPS[basemapId === 'satellite' ? 'openstreetmap' : 'satellite']
  return (
    <section className="map-region" aria-label="Interactive basemap">
      <button
        type="button"
        className="basemap-switch"
        onClick={() => setBasemapId(nextBasemap.id)}
        aria-label={`Basemap: ${basemap.name}. Switch to ${nextBasemap.name}.`}
        title={`Switch to ${nextBasemap.name}`}
      >
        <Icon name="layers" size={15} />
        <span>Basemap</span>
        <strong>{basemap.shortName}</strong>
      </button>
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        maxZoom={BASEMAP_MAX_ZOOM}
        className="leaflet-map"
        zoomControl={false}
      >
        <TileLayer
          key={basemap.id}
          url={basemap.url}
          attribution={basemap.attribution}
          maxZoom={basemap.maxZoom}
          maxNativeZoom={basemap.maxNativeZoom}
        />
        <ScaleControl imperial={false} maxWidth={120} position="bottomright" />
        <MapClickHandler
          drawing={drawing}
          resultMap={resultMap}
          selectionMode={selectionMode}
          onMapClick={onMapClick}
          onResultClick={onResultClick}
        />
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
          >
            {draftAreaKm2 !== null ? (
              <Tooltip direction="top" offset={[0, -8]} sticky>
                Area: {formatAreaKm2(draftAreaKm2)}
              </Tooltip>
            ) : null}
          </Polygon>
        ) : null}
        {resultMap?.bounds && resultVisible ? (
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
        {selectionPoint ? (
          <CircleMarker
            center={[selectionPoint.lat, selectionPoint.lng]}
            radius={7}
            pathOptions={{ color: '#ffd166', weight: 2, fillColor: '#ffd166', fillOpacity: 0.9 }}
          />
        ) : null}
        {selectionVertices.length > 1 ? (
          <Polygon
            positions={selectionVertices.map(
              (position) => [position.lat, position.lng] as [number, number],
            )}
            pathOptions={{ color: '#ffd166', weight: 2, dashArray: '4 5', fillOpacity: 0.1 }}
          >
            {selectionAreaKm2 !== null ? (
              <Tooltip direction="top" offset={[0, -8]} sticky>
                Area: {formatAreaKm2(selectionAreaKm2)}
              </Tooltip>
            ) : null}
          </Polygon>
        ) : null}
      </MapContainer>
    </section>
  )
}
