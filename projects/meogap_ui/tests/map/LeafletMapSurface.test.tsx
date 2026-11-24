import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const leafletState = vi.hoisted(() => ({
  click: undefined as undefined | ((event: { latlng: { lat: number; lng: number } }) => void),
  flyTo: vi.fn(),
  fitBounds: vi.fn(),
  setView: vi.fn(),
  polygonClicks: [] as Array<(() => void) | undefined>,
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: ({ attribution }: { attribution: string }) => <span>{attribution}</span>,
  ScaleControl: ({ position, imperial }: { position?: string; imperial?: boolean }) => (
    <div data-imperial={String(imperial)} data-position={position} data-testid="scale-control">
      1 km
    </div>
  ),
  Polygon: ({
    positions,
    eventHandlers,
  }: {
    positions: unknown
    eventHandlers?: { click?: () => void }
  }) => {
    leafletState.polygonClicks.push(eventHandlers?.click)
    return <output>{JSON.stringify(positions)}</output>
  },
  ImageOverlay: ({ url }: { url: string }) => <img alt="Result map" src={url} />,
  CircleMarker: ({ center }: { center: [number, number] }) => (
    <output data-testid="selection-point">{JSON.stringify(center)}</output>
  ),
  useMap: () => ({
    flyTo: leafletState.flyTo,
    fitBounds: leafletState.fitBounds,
    setView: leafletState.setView,
  }),
  useMapEvents: (handlers: {
    click: (event: { latlng: { lat: number; lng: number } }) => void
  }) => {
    leafletState.click = handlers.click
    return undefined
  },
}))

import { LeafletMapSurface } from '../../src/map/LeafletMapSurface'

const AOI = {
  id: 'aoi-1',
  name: 'Guanacaste study area',
  description: null,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [-85, 10.35],
        [-84.82, 10.5],
        [-85, 10.35],
      ],
    ],
  },
  revision: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('LeafletMapSurface', () => {
  beforeEach(() => {
    leafletState.flyTo.mockClear()
    leafletState.fitBounds.mockClear()
    leafletState.setView.mockClear()
    leafletState.polygonClicks.length = 0
  })

  it(
    'wires Leaflet events, scale, attribution, AOIs, and result overlays',
    { tags: ['unit'] },
    () => {
      const onMapClick = vi.fn()
      const onAoiSelect = vi.fn()
      render(
        <LeafletMapSurface
          aois={[AOI]}
          draftVertices={[
            { lat: 10.4, lng: -84.98 },
            { lat: 10.45, lng: -84.9 },
          ]}
          drawing
          focus={{ type: 'point', lat: 10.43, lng: -84.91, zoom: 10 }}
          focusRevision={1}
          resultMap={{
            url: 'https://example.test/map.png',
            bounds: [
              { lat: 10.35, lng: -85 },
              { lat: 10.5, lng: -84.82 },
            ],
            requestId: 'request-1',
            productId: 'ndvi',
            resultVersion: '1',
            units: 'unitless',
            validationStatus: 'NOT_VALIDATED',
            qualityStatus: 'PARTIAL',
            qualityNote: 'Synthetic demo quality.',
            isDemo: true,
          }}
          resultVisible
          selectionMode="point"
          selectionPoint={{ lat: 10.4, lng: -84.9 }}
          selectionVertices={[]}
          selectedAoiId="aoi-1"
          onMapClick={onMapClick}
          onResultClick={vi.fn()}
          onAoiSelect={onAoiSelect}
        />,
      )

      expect(screen.getByTestId('map-container')).toBeInTheDocument()
      expect(screen.getByText(/EOxCloudless/)).toBeInTheDocument()
      expect(screen.getByTestId('scale-control')).toHaveAttribute('data-position', 'bottomright')
      expect(screen.getByTestId('scale-control')).toHaveAttribute('data-imperial', 'false')
      expect(screen.getByRole('img', { name: 'Result map' })).toHaveAttribute(
        'src',
        'https://example.test/map.png',
      )
      expect(leafletState.flyTo).toHaveBeenCalledWith([10.43, -84.91], 10)
      act(() => leafletState.click?.({ latlng: { lat: 10.48, lng: -84.88 } }))
      expect(onMapClick).toHaveBeenCalledWith({ lat: 10.48, lng: -84.88 })
      act(() => leafletState.polygonClicks[0]?.())
      expect(onAoiSelect).toHaveBeenCalledWith('aoi-1')
      expect(screen.getByTestId('selection-point')).toHaveTextContent('[10.4,-84.9]')
      expect(screen.getByRole('img', { name: 'Result map' })).toBeInTheDocument()
    },
  )

  it('does not forward map clicks while drawing is inactive', { tags: ['unit'] }, () => {
    const onMapClick = vi.fn()
    render(
      <LeafletMapSurface
        aois={[AOI]}
        draftVertices={[]}
        drawing={false}
        focus={null}
        focusRevision={0}
        resultMap={null}
        resultVisible
        selectionMode="none"
        selectionPoint={null}
        selectionVertices={[]}
        selectedAoiId="another-aoi"
        onMapClick={onMapClick}
        onResultClick={vi.fn()}
        onAoiSelect={vi.fn()}
      />,
    )

    act(() => leafletState.click?.({ latlng: { lat: 10.48, lng: -84.88 } }))
    expect(onMapClick).not.toHaveBeenCalled()
    expect(leafletState.setView).toHaveBeenCalledWith([20, 0], 3)
  })

  it('fits the complete AOI bounds instead of a single point', { tags: ['unit'] }, () => {
    render(
      <LeafletMapSurface
        aois={[AOI]}
        draftVertices={[]}
        drawing={false}
        focus={{
          type: 'bounds',
          bounds: { south: 10.35, west: -85, north: 10.5, east: -84.82 },
          maxZoom: 13,
          paddingTopLeft: [112, 96],
          paddingBottomRight: [480, 210],
        }}
        focusRevision={2}
        resultMap={null}
        resultVisible
        selectionMode="none"
        selectionPoint={null}
        selectionVertices={[]}
        selectedAoiId="aoi-1"
        onMapClick={vi.fn()}
        onResultClick={vi.fn()}
        onAoiSelect={vi.fn()}
      />,
    )

    expect(leafletState.fitBounds).toHaveBeenCalledWith(
      [
        [10.35, -85],
        [10.5, -84.82],
      ],
      { maxZoom: 13, paddingTopLeft: [112, 96], paddingBottomRight: [480, 210] },
    )
    expect(leafletState.flyTo).not.toHaveBeenCalled()
    expect(leafletState.setView).not.toHaveBeenCalled()
  })
})
