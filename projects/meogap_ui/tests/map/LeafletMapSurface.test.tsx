import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const leafletState = vi.hoisted(() => ({
  click: undefined as undefined | ((event: { latlng: { lat: number; lng: number } }) => void),
  flyTo: vi.fn(),
  setView: vi.fn(),
  polygonClicks: [] as Array<(() => void) | undefined>,
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: ({ attribution }: { attribution: string }) => <span>{attribution}</span>,
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
  useMap: () => ({ flyTo: leafletState.flyTo, setView: leafletState.setView }),
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
  it(
    'wires Leaflet map events, OSM attribution, AOIs, and result overlays',
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
          focus={{ lat: 10.43, lng: -84.91, zoom: 10 }}
          resultMap={{
            url: 'https://example.test/map.png',
            bounds: [
              { lat: 10.35, lng: -85 },
              { lat: 10.5, lng: -84.82 },
            ],
          }}
          selectedAoiId="aoi-1"
          onMapClick={onMapClick}
          onAoiSelect={onAoiSelect}
        />,
      )

      expect(screen.getByTestId('map-container')).toBeInTheDocument()
      expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Result map' })).toHaveAttribute(
        'src',
        'https://example.test/map.png',
      )
      expect(leafletState.flyTo).toHaveBeenCalledWith([10.43, -84.91], 10)
      act(() => leafletState.click?.({ latlng: { lat: 10.48, lng: -84.88 } }))
      expect(onMapClick).toHaveBeenCalledWith({ lat: 10.48, lng: -84.88 })
      act(() => leafletState.polygonClicks[0]?.())
      expect(onAoiSelect).toHaveBeenCalledWith('aoi-1')
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
        resultMap={null}
        selectedAoiId="another-aoi"
        onMapClick={onMapClick}
        onAoiSelect={vi.fn()}
      />,
    )

    act(() => leafletState.click?.({ latlng: { lat: 10.48, lng: -84.88 } }))
    expect(onMapClick).not.toHaveBeenCalled()
    expect(leafletState.setView).toHaveBeenCalledWith([20, 0], 3)
  })
})
