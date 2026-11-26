import { render } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../../src/App'
import type { MapSurfaceProps } from '../../src/map/LeafletMapSurface'

export const AOI = {
  aoi_id: 'aoi-1',
  name: 'Toulouse study area',
  description: 'A saved area',
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [1.38, 43.56],
        [1.49, 43.56],
        [1.49, 43.66],
        [1.38, 43.56],
      ],
    ],
  },
  revision: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

export const PRODUCT = {
  product_id: 'ndvi',
  name: 'NDVI',
  description: 'Synthetic vegetation index descriptor',
  level: 'L1',
  category: 'Vegetation',
  native_resolution: '10 m',
  temporal_resolution: '5 days',
  units: 'unitless',
  availability: 'DEMO',
  provenance: 'SYNTHETIC_DEMO',
  validation_status: 'NOT_VALIDATED',
  documentation_status: 'PLACEHOLDER',
  documentation_url: null,
  max_period_months: 120,
  inputs: ['Red reflectance', 'Near-infrared reflectance'],
  parameters: ['ndvi'],
  limitations: [
    'This is a deterministic synthetic M0 descriptor; no Earth observation data is acquired.',
  ],
  supported_sources: ['Sentinel', 'Landsat'],
  supported_resolutions_m: [10, 20, 30],
  supported_spatial_inputs: ['AOI'],
  supported_selection_geometries: ['POINT', 'POLYGON', 'RESULT_EXTENT'],
  supported_frequencies: ['monthly', 'semimonthly', 'weekly', 'three_day', 'two_day', 'daily'],
  preview: {
    url: 'data:image/svg+xml,preview-ndvi',
    alt: 'NDVI illustrative preview',
    attribution: 'MEOGAP synthetic illustration - not a scientific result',
  },
}

export const REQUEST = {
  request_id: 'request-1',
  state: 'queued',
  product_id: 'ndvi',
  aoi_id: 'aoi-1',
  start_month: '2026-01',
  end_month: '2026-02',
  requested_sources: ['Sentinel'],
  requested_spatial_resolution_m: 20,
  temporal_frequency: 'monthly',
  provenance: 'SYNTHETIC_DEMO',
  estimated_credits: 3,
  actual_credits: null,
  result_id: null,
  aoi_name: 'Toulouse study area',
  source_aoi_revision: 1,
  geometry_snapshot: AOI.geometry,
  failure: null,
  message: 'Request queued for deterministic demo processing.',
}

export const SUCCEEDED_REQUEST = {
  ...REQUEST,
  state: 'succeeded',
  actual_credits: 2,
  result_id: 'result-1',
  message: 'Synthetic demo result available.',
}

const SERIES_POINTS = [
  {
    parameter: 'ndvi',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    value: 0,
    unit: 'unitless',
    state: 'VALID',
    quality_status: 'VALID',
    coverage: null,
    note: 'Synthetic demo measured zero, distinct from a missing observation.',
  },
  {
    parameter: 'ndvi',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    value: 0.4,
    unit: 'unitless',
    state: 'VALID',
    quality_status: 'VALID',
    coverage: null,
    note: null,
  },
  {
    parameter: 'ndvi',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    value: null,
    unit: 'unitless',
    state: 'MISSING',
    quality_status: 'UNKNOWN',
    coverage: null,
    note: 'Synthetic demo period has no observation. This is not a zero.',
  },
  {
    parameter: 'ndvi',
    period_start: '2026-06-01',
    period_end: '2026-06-30',
    value: 0.55,
    unit: 'unitless',
    state: 'VALID',
    quality_status: 'VALID',
    coverage: null,
    note: null,
  },
  {
    parameter: 'ndvi',
    period_start: '2026-07-01',
    period_end: '2026-07-31',
    value: null,
    unit: 'unitless',
    state: 'MASKED',
    quality_status: 'PARTIAL',
    coverage: null,
    note: 'Synthetic demo observation masked by quality filtering.',
  },
]

export const SERIES_PAYLOAD = {
  result_id: 'result-1',
  product_id: 'ndvi',
  geometry_wkt: 'POINT(1.44 43.6)',
  crs: 'EPSG:4326',
  selection_type: 'Point',
  aggregation_method: 'point_sample',
  selection_area_km2: 0,
  units: 'unitless',
  available_parameters: [{ name: 'ndvi', label: 'NDVI', units: 'unitless' }],
  selected_parameters: ['ndvi'],
  quality_status: 'PARTIAL',
  quality_note: 'Synthetic demo series; missing and masked values are not zeros.',
  coverage: null,
  provenance: 'SYNTHETIC_DEMO',
  is_demo: true,
  note: 'Synthetic demonstration values.',
  points: SERIES_POINTS,
}

export const SERIES_TWO_PARAMETERS = {
  ...SERIES_PAYLOAD,
  available_parameters: [
    { name: 'ndvi', label: 'NDVI', units: 'unitless' },
    { name: 'coverage', label: 'COVERAGE', units: 'fraction' },
  ],
  selected_parameters: ['ndvi'],
}

const DRAWING_POINTS = [
  { lat: 43.6, lng: 1.42 },
  { lat: 43.61, lng: 1.43 },
  { lat: 43.62, lng: 1.42 },
]

let drawingPointIndex = 0

export function resetFixtures(): void {
  drawingPointIndex = 0
}

function gatewayResponse(payload: unknown, demo = false): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (demo && name === 'X-MEOGAP-Demo' ? 'true' : null) },
    json: async () => payload,
  } as unknown as Response
}

function describeFocus(focus: MapSurfaceProps['focus']): string {
  if (!focus) return 'No map focus'
  if (focus.type === 'bounds') {
    const { south, west, north, east } = focus.bounds
    return `Bounds ${south},${west},${north},${east}`
  }
  return `${focus.lat},${focus.lng}`
}

export function fakeMapSurface({
  drawing,
  focus,
  selectionMode,
  onMapClick,
  onResultClick,
  onAoiSelect,
  aois,
  resultMap,
  resultFrameIndex,
}: MapSurfaceProps) {
  return (
    <section aria-label="Test map">
      <output aria-label="Map focus">{describeFocus(focus)}</output>
      <output aria-label="Selection mode">{selectionMode}</output>
      <output aria-label="Displayed result frame">
        {resultMap?.frames[resultFrameIndex]?.periodStart ?? 'none'}
      </output>
      {drawing ? (
        <button
          type="button"
          onClick={() => {
            onMapClick(DRAWING_POINTS[drawingPointIndex % DRAWING_POINTS.length])
            drawingPointIndex += 1
          }}
        >
          Add map point
        </button>
      ) : (
        <button type="button" onClick={() => onMapClick({ lat: 0, lng: 0 })}>
          Map click
        </button>
      )}
      <button type="button" onClick={() => onResultClick({ lat: 43.6, lng: 1.44 })}>
        Result point click
      </button>
      <button type="button" onClick={() => onResultClick({ lat: 43.58, lng: 1.42 })}>
        Result polygon click A
      </button>
      <button type="button" onClick={() => onResultClick({ lat: 43.58, lng: 1.44 })}>
        Result polygon click B
      </button>
      <button type="button" onClick={() => onResultClick({ lat: 43.6, lng: 1.44 })}>
        Result polygon click C
      </button>
      <button type="button" onClick={() => onResultClick({ lat: 44.0, lng: 2.0 })}>
        Result click outside
      </button>
      {aois.map((aoi) => (
        <button type="button" key={aoi.id} onClick={() => onAoiSelect(aoi.id)}>
          Select {aoi.name}
        </button>
      ))}
    </section>
  )
}

type StubOptions = {
  request?: Record<string, unknown>
  requestSequence?: Record<string, unknown>[]
  demo?: boolean
  seriesFails?: boolean
  catalogueFails?: boolean
  requestsFail?: boolean
  product?: Record<string, unknown>
  aoi?: Record<string, unknown>
  credits?: { balance: number; unit: string }
  series?: Record<string, unknown>
}

function errorResponse(code: string, message: string, status = 500): Response {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    json: async () => ({ code, message, service: 'gateway', operation: 'test' }),
  } as unknown as Response
}

export function stubGateway(options: StubOptions = {}) {
  let currentRequest = options.request ?? SUCCEEDED_REQUEST
  const product = options.product ?? PRODUCT
  const aoi = options.aoi ?? AOI
  const credits = options.credits ?? { balance: 12, unit: 'credits' }
  const sourceIds = Array.isArray(product.supported_sources)
    ? (product.supported_sources as string[])
    : []
  const missions = sourceIds.map((sourceId) => ({
    source_id: sourceId,
    name: sourceId,
    provider: 'Demo provider',
    instrument: 'Demo instrument',
    native_resolution: '10 m',
    temporal_resolution: '5 days',
    availability: 'DEMO',
  }))
  const estimatedCost = 3
  const admission = credits.balance >= estimatedCost ? 'ADMITTED' : 'INSUFFICIENT_CREDITS'
  let listCall = 0
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/v1/health')
      return gatewayResponse({ status: 'ok', service: 'gateway', version: '0.2.0' }, options.demo)
    if (path.startsWith('/api/v1/places/suggestions')) {
      const url = new URL(path, 'http://local.test')
      const query = (url.searchParams.get('q') ?? '').toLowerCase()
      const items = [
        {
          place_id: 1,
          name: 'Toulouse',
          country: 'France',
          admin1: 'Occitanie',
          latitude: 43.6045,
          longitude: 1.4442,
          population: 511684,
          feature_code: 'PPLA',
          match_type: 'exact',
        },
        {
          place_id: 2,
          name: 'London',
          country: 'United Kingdom',
          admin1: 'England',
          latitude: 51.5072,
          longitude: -0.1276,
          population: 8961989,
          feature_code: 'PPLC',
          match_type: 'exact',
        },
      ].filter((place) => !query || place.name.toLowerCase().startsWith(query))
      return gatewayResponse({ items })
    }
    if (path === '/api/v1/account')
      return gatewayResponse({
        user_id: 'demo-user',
        display_name: 'MEOGAP demo user',
        session_status: 'AUTHENTICATED',
      })
    if (path === '/api/v1/aois' && init?.method === 'POST')
      return gatewayResponse({ ...aoi, name: 'New area' })
    if (path === '/api/v1/aois') return gatewayResponse({ items: [aoi] })
    if (path === '/api/v1/aois/aoi-1') return gatewayResponse(aoi)
    if (path === '/api/v1/catalogue/products')
      return options.catalogueFails
        ? errorResponse('CATALOGUE_UNAVAILABLE', 'Catalogue unavailable')
        : gatewayResponse({ items: [product] }, options.demo)
    if (path === '/api/v1/catalogue/products/ndvi') return gatewayResponse(product)
    if (path === '/api/v1/catalogue/products/ndvi/input-requirements')
      return gatewayResponse({
        product_id: 'ndvi',
        inputs: ['Red reflectance', 'Near-infrared reflectance'],
        limitations: ['Deterministic synthetic M0 descriptor.'],
        note: 'No real acquisition or validation is implemented.',
      })
    if (path === '/api/v1/catalogue/products/ndvi/missions')
      return gatewayResponse({ product_id: 'ndvi', items: missions })
    if (path === '/api/v1/analysis-requests/estimate')
      return gatewayResponse({
        product_id: 'ndvi',
        aoi_id: 'aoi-1',
        start_month: '2026-01',
        end_month: '2026-02',
        feasible: admission === 'ADMITTED',
        estimated_credits: estimatedCost,
        currency: 'credits',
        balance: credits.balance,
        balance_available: true,
        admission,
        conditions: ['Deterministic M0 demo estimate.'],
        limitations: ['Not a financial commitment.'],
      })
    if (path === '/api/v1/analysis-requests' && init?.method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { temporal_frequency?: string }
      return gatewayResponse({
        ...REQUEST,
        request_id: 'request-new',
        state: 'queued',
        temporal_frequency: body.temporal_frequency ?? null,
      })
    }
    if (path === '/api/v1/analysis-requests') {
      if (options.requestsFail) {
        return errorResponse('REQUESTS_UNAVAILABLE', 'Requests unavailable')
      }
      if (options.requestSequence) {
        const next = options.requestSequence[Math.min(listCall, options.requestSequence.length - 1)]
        listCall += 1
        return gatewayResponse({ items: [next] })
      }
      return gatewayResponse({ items: [currentRequest] })
    }
    if (path === '/api/v1/analysis-requests/request-1/cancel') {
      currentRequest = { ...REQUEST, state: 'cancelled' }
      return gatewayResponse(currentRequest)
    }
    if (path === '/api/v1/analysis-requests/request-1') return gatewayResponse(currentRequest)
    if (path.startsWith('/api/v1/results/result-1/map'))
      return gatewayResponse({
        url: 'https://example.test/map.png',
        bounds: [
          [43.56, 1.38],
          [43.66, 1.49],
        ],
        kind: 'SYNTHETIC_DEMO_NDVI',
        provenance: 'SYNTHETIC_DEMO',
        note: 'Synthetic georeferenced NDVI-like demonstration raster.',
        request_id: 'request-1',
        product_id: 'ndvi',
        result_version: '1',
        units: 'unitless',
        validation_status: 'NOT_VALIDATED',
        quality_status: 'UNKNOWN',
        quality_note: 'No observation quality is computed.',
        legend: {
          title: 'NDVI',
          units: 'unitless',
          min: -0.2,
          max: 0.9,
          stops: [
            { value: -0.2, color: '#744d2e' },
            { value: 0.9, color: '#0c461c' },
          ],
        },
        geotiff_url: '/demo-assets/ndvi/geotiff/test.tif',
        frames: [
          {
            frame_id: 'result-1-frame-1',
            url: '/demo-assets/ndvi/test-1.png',
            period_start: '2026-01-01',
            period_end: '2026-01-31',
            label: '2026-01',
            visual_period_start: '2025-06-01',
            visual_period_end: '2025-07-31',
            is_reused_visual: true,
          },
          {
            frame_id: 'result-1-frame-2',
            url: '/demo-assets/ndvi/test-2.png',
            period_start: '2026-02-01',
            period_end: '2026-02-28',
            label: '2026-02',
            visual_period_start: '2025-07-01',
            visual_period_end: '2025-08-31',
            is_reused_visual: true,
          },
        ],
        is_demo: true,
      })
    if (path === '/api/v1/results/result-1')
      return gatewayResponse({
        result_id: 'result-1',
        request_id: 'request-1',
        product_id: 'ndvi',
        product_name: 'NDVI',
        result_version: '1',
        aoi_name: 'Toulouse study area',
        geometry_snapshot: AOI.geometry,
        start_month: '2026-01',
        end_month: '2026-02',
        units: 'unitless',
        temporal_frequency: 'monthly',
        provenance: 'SYNTHETIC_DEMO',
        available_parameters: [{ name: 'ndvi', label: 'NDVI', units: 'unitless' }],
        validation_status: 'NOT_VALIDATED',
        quality_status: 'UNKNOWN',
        quality_note: 'No observation quality is computed.',
        provenance_note: 'SYNTHETIC_DEMO: no Sentinel, Landsat or other mission data was used.',
        is_demo: true,
      })
    if (path === '/api/v1/results/result-1/series' && init?.method === 'POST') {
      if (options.seriesFails) {
        return {
          ok: false,
          status: 500,
          headers: { get: () => null },
          json: async () => ({
            code: 'SERIES_UNAVAILABLE',
            message: 'Series unavailable',
            service: 'gateway',
            operation: 'gateway_query_result_series',
          }),
        } as unknown as Response
      }
      return gatewayResponse(options.series ?? SERIES_PAYLOAD)
    }
    if (path === '/api/v1/results/result-1/deliveries') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { kind?: string }
      return gatewayResponse({
        delivery_id: 'delivery-1',
        kind: body.kind ?? 'final_product',
        state: 'READY',
        download_url: 'https://example.test/result.geojson',
        message: 'Synthetic demo artifact ready for download.',
      })
    }
    if (path === '/api/v1/deliveries/delivery-1')
      return gatewayResponse({
        delivery_id: 'delivery-1',
        kind: 'final_product',
        state: 'READY',
        download_url: 'https://example.test/result.geojson',
      })
    if (path === '/api/v1/credits/balance') return gatewayResponse(credits)
    throw new Error(`Unexpected Gateway path ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function renderApp(options: StubOptions & { pollIntervalMs?: number } = {}) {
  const fetchMock = stubGateway(options)
  const view = render(
    <App MapSurface={fakeMapSurface} pollIntervalMs={options.pollIntervalMs ?? 20} />,
  )
  return { ...view, fetchMock }
}
