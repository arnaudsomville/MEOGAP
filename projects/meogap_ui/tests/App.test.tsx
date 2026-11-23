import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { MapSurfaceProps } from '../src/map/LeafletMapSurface'

const AOI = {
  aoi_id: 'aoi-1',
  name: 'Toulouse study area',
  description: 'A saved area',
  geometry: {
    type: 'Polygon',
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

const MULTI_AOI = {
  ...AOI,
  name: 'Guanacaste study area',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [1.38, 43.56],
          [1.45, 43.56],
          [1.45, 43.6],
          [1.38, 43.56],
        ],
      ],
      [
        [
          [1.46, 43.62],
          [1.49, 43.62],
          [1.49, 43.66],
          [1.46, 43.62],
        ],
      ],
    ],
  },
}

const PRODUCT = {
  product_id: 'ndvi',
  name: 'NDVI',
  description: 'Vegetation index',
  level: 'L1',
  category: 'Vegetation',
  native_resolution: '10 m',
  temporal_resolution: '5 days',
  availability: 'DEMO',
  validation_status: 'NOT_VALIDATED',
  inputs: ['Red reflectance', 'Near-infrared reflectance'],
  parameters: [],
  limitations: ['Deterministic M0 descriptor.'],
  supported_sources: ['Sentinel', 'Landsat', 'MODIS', 'VIIRS'],
  supported_resolutions_m: [10, 20, 30],
  preview: {
    url: 'data:image/svg+xml,preview-ndvi',
    alt: 'NDVI illustrative preview',
    attribution: 'MEOGAP synthetic illustration',
  },
}

const PROPOSED_REQUEST = {
  request_id: 'request-1',
  state: 'PROPOSED',
  product_id: 'ndvi',
  aoi_id: 'aoi-1',
  start_month: '2026-01',
  end_month: '2026-02',
  requested_sources: ['Sentinel'],
  requested_spatial_resolution_m: 20,
  proposal: { estimated_credits: 3 },
  result_id: 'result-1',
}

const DRAWING_POINTS = [
  { lat: 43.6, lng: 1.42 },
  { lat: 43.61, lng: 1.43 },
  { lat: 43.62, lng: 1.42 },
]

let drawingPointIndex = 0

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

function fakeMapSurface({ drawing, focus, onMapClick, onAoiSelect, aois }: MapSurfaceProps) {
  return (
    <section aria-label="Test map">
      <output aria-label="Map focus">{describeFocus(focus)}</output>
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
      {aois.map((aoi) => (
        <button type="button" key={aoi.id} onClick={() => onAoiSelect(aoi.id)}>
          Select {aoi.name}
        </button>
      ))}
    </section>
  )
}

function stubGateway(
  options: {
    request?: Record<string, unknown>
    demo?: boolean
    deliveryPreparing?: boolean
    product?: Record<string, unknown>
    aoi?: Record<string, unknown>
  } = {},
) {
  const completed = { ...PROPOSED_REQUEST, state: 'COMPLETED', actual_credits: 2 }
  let currentRequest = options.request ?? PROPOSED_REQUEST
  const product = options.product ?? PRODUCT
  const aoi = options.aoi ?? AOI
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/v1/health')
      return gatewayResponse({ status: 'ok', service: 'gateway', version: '0.2.0' }, options.demo)
    if (path === '/api/v1/aois' && init?.method === 'POST')
      return gatewayResponse({ ...aoi, name: 'New area' })
    if (path === '/api/v1/aois') return gatewayResponse({ items: [aoi] })
    if (path === '/api/v1/aois/aoi-1') return gatewayResponse(aoi)
    if (path === '/api/v1/catalogue/products')
      return gatewayResponse({ items: [product] }, options.demo)
    if (path === '/api/v1/catalogue/products/ndvi') return gatewayResponse(product)
    if (path === '/api/v1/catalogue/products/ndvi/input-requirements')
      return gatewayResponse({
        product_id: 'ndvi',
        inputs: ['Red reflectance', 'Near-infrared reflectance'],
        limitations: ['Deterministic M0 descriptor.'],
        note: 'No real acquisition or validation is implemented.',
      })
    if (path === '/api/v1/analysis-requests' && init?.method === 'POST')
      return gatewayResponse({ ...PROPOSED_REQUEST, request_id: 'request-new', state: 'PREPARING' })
    if (path === '/api/v1/analysis-requests') return gatewayResponse({ items: [currentRequest] })
    if (path === '/api/v1/analysis-requests/request-1/confirm') {
      currentRequest = completed
      return gatewayResponse(completed)
    }
    if (path === '/api/v1/analysis-requests/request-1/cancel') {
      currentRequest = { ...PROPOSED_REQUEST, state: 'CANCELLED' }
      return gatewayResponse(currentRequest)
    }
    if (path === '/api/v1/analysis-requests/request-1') return gatewayResponse(currentRequest)
    if (path === '/api/v1/results/result-1/map')
      return gatewayResponse({
        map_url: 'https://example.test/map.png',
        bounds: [
          [43.56, 1.38],
          [43.66, 1.49],
        ],
      })
    if (path === '/api/v1/results/result-1/deliveries')
      return gatewayResponse(
        options.deliveryPreparing
          ? { delivery_id: 'delivery-1', state: 'PREPARING' }
          : {
              delivery_id: 'delivery-1',
              state: 'READY',
              download_url: 'https://example.test/result.zip',
            },
      )
    if (path === '/api/v1/deliveries/delivery-1')
      return gatewayResponse({
        delivery_id: 'delivery-1',
        state: 'READY',
        download_url: 'https://example.test/result.zip',
      })
    if (path === '/api/v1/credits/balance') return gatewayResponse({ balance: 12, unit: 'credits' })
    throw new Error(`Unexpected Gateway path ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  drawingPointIndex = 0
})

describe('App', () => {
  it(
    'loads the catalogue through Gateway data and submits a configured request',
    { tags: ['unit'] },
    async () => {
      const fetchMock = stubGateway({ demo: true })
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Explore' }))
      await user.click(await screen.findByRole('button', { name: /NDVI/ }))
      expect((await screen.findAllByText('Vegetation index')).length).toBeGreaterThan(0)
      expect(
        screen.getByText('Demo data: this workspace is not showing real EO processing.'),
      ).toBeInTheDocument()
      expect(screen.queryByText(/Gateway ok/i)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Configure request' }))
      await user.selectOptions(screen.getByLabelText('Saved AOI'), 'aoi-1')
      await user.type(screen.getByLabelText('Start month (UTC)'), '2026-01')
      await user.type(screen.getByLabelText('End month (UTC)'), '2026-02')
      await user.click(screen.getByRole('button', { name: 'Submit request' }))

      expect(await screen.findByText('PREPARING')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/analysis-requests',
        expect.objectContaining({ method: 'POST' }),
      )
    },
  )

  it(
    'draws a polygon with the injected map and persists it as a saved AOI',
    { tags: ['unit'] },
    async () => {
      const fetchMock = stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Draw a new AOI polygon' }))
      const point = await screen.findByRole('button', { name: 'Add map point' })
      await user.click(point)
      await user.click(point)
      await user.click(point)
      await user.type(screen.getByLabelText('Area name'), 'New area')
      await user.click(screen.getByRole('button', { name: 'Save AOI' }))

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/aois',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(
            '"coordinates":[[[1.42,43.6],[1.43,43.61],[1.42,43.62],[1.42,43.6]]]',
          ),
        }),
      )
    },
  )

  it(
    'confirms a proposal, displays its result, and exposes a ready delivery',
    { tags: ['unit'] },
    async () => {
      stubGateway({ deliveryPreparing: true })
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Requests' }))
      await user.click(await screen.findByRole('button', { name: 'Confirm execution' }))
      expect(await screen.findByText('COMPLETED')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Display on map' }))
      expect(
        await screen.findByText('Map representation loaded for this result.'),
      ).toBeInTheDocument()
      expect(screen.getByText('43.61,1.435')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Requests' }))
      await user.click(screen.getByRole('button', { name: 'Prepare download' }))
      expect(await screen.findByRole('button', { name: 'Refresh delivery' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Refresh delivery' }))
      expect(await screen.findByRole('link', { name: 'Download delivery' })).toHaveAttribute(
        'href',
        'https://example.test/result.zip',
      )
    },
  )

  it(
    'supports coordinate search, account balance, empty indicators, and Escape panel closure',
    { tags: ['unit'] },
    async () => {
      stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.type(screen.getByLabelText('Coordinates or saved AOI'), '43.6047, 1.4442')
      await user.click(screen.getByRole('button', { name: 'Locate' }))
      expect(screen.getByText('43.6047,1.4442')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Map click' }))
      expect(screen.getByText('43.6047,1.4442')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Account' }))
      expect(await screen.findByText('12 credits')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('heading', { name: 'Account and credits' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Account' })).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Indicators' }))
      expect(screen.getByText('No indicators are configured.')).toBeInTheDocument()
      expect(
        within(screen.getByLabelText('Result inspector')).getByRole('button', {
          name: 'Show result inspector',
        }),
      ).toBeInTheDocument()
    },
  )

  it(
    'selects, edits, and deletes saved AOIs through Gateway operations',
    { tags: ['unit'] },
    async () => {
      const fetchMock = stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.type(screen.getByLabelText('Coordinates or saved AOI'), 'Toulouse')
      await user.click(screen.getByRole('button', { name: 'Locate' }))
      const library = await screen.findByLabelText('AOI library')
      await user.click(within(library).getByRole('button', { name: /Toulouse/ }))
      await waitFor(() =>
        expect(screen.getByLabelText('Map focus')).toHaveTextContent(
          'Bounds 43.56,1.38,43.66,1.49',
        ),
      )
      expect(await screen.findByRole('button', { name: 'Edit selected' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit selected' }))
      await user.click(screen.getByRole('button', { name: 'Reset drawing' }))
      expect(within(library).getByRole('button', { name: /Toulouse/ })).toBeInTheDocument()
      const point = screen.getByRole('button', { name: 'Add map point' })
      await user.click(point)
      await user.click(point)
      await user.click(point)
      await user.click(screen.getByRole('button', { name: 'Save AOI' }))
      await user.click(screen.getByRole('button', { name: 'Delete selected' }))
      await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/aois/aoi-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: 'Bearer m0-ui-demo-token' },
        }),
      )
      expect(screen.queryByRole('button', { name: 'Delete selected' })).not.toBeInTheDocument()
    },
  )

  it('fits a MultiPolygon AOI to its complete geometry bounds', { tags: ['unit'] }, async () => {
    stubGateway({ aoi: MULTI_AOI })
    const user = userEvent.setup()
    render(<App MapSurface={fakeMapSurface} />)

    await user.click(await screen.findByRole('button', { name: 'Select Guanacaste study area' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Map focus')).toHaveTextContent('Bounds 43.56,1.38,43.66,1.49'),
    )
  })

  it(
    'returns to the request form after creating an AOI and can cancel a request',
    { tags: ['unit'] },
    async () => {
      stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Explore' }))
      await user.click(await screen.findByRole('button', { name: /NDVI/ }))
      await user.click(await screen.findByRole('button', { name: 'Configure request' }))
      await user.click(screen.getByRole('button', { name: 'Create a saved AOI' }))
      const point = await screen.findByRole('button', { name: 'Add map point' })
      await user.click(point)
      await user.click(point)
      await user.click(point)
      await user.type(screen.getByLabelText('Area name'), 'New area')
      await user.click(screen.getByRole('button', { name: 'Save AOI' }))
      expect(
        await screen.findByRole('heading', { name: 'New analysis request' }),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Saved AOI')).toHaveValue('aoi-1')
      await user.click(screen.getByRole('button', { name: 'Requests' }))
      await user.click(await screen.findByRole('button', { name: 'Refresh' }))
      await user.click(screen.getByRole('button', { name: 'Cancel request' }))
      expect(await screen.findByText('CANCELLED')).toBeInTheDocument()
    },
  )

  it(
    'shows and dismisses Gateway failures without creating fallback records',
    { tags: ['unit'] },
    async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('network unavailable')
        }),
      )
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      expect(await screen.findByRole('alert')).toHaveTextContent('network unavailable')
      expect(screen.queryByText(/Gateway ok/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Gateway unavailable/i)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      expect(screen.getByText('The product catalogue is unavailable.')).toBeInTheDocument()
    },
  )

  it(
    'renders preparing, executing, and result-unavailable request states explicitly',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      stubGateway({ request: { ...PROPOSED_REQUEST, state: 'PREPARING', result_id: undefined } })
      const preparing = render(<App MapSurface={fakeMapSurface} />)
      await user.click(screen.getByRole('button', { name: 'Requests' }))
      expect(await screen.findByText('Preparing a proposal.')).toBeInTheDocument()
      preparing.unmount()

      vi.unstubAllGlobals()
      stubGateway({ request: { ...PROPOSED_REQUEST, state: 'IN_EXECUTION', message: 'Working' } })
      const executing = render(<App MapSurface={fakeMapSurface} />)
      await user.click(screen.getByRole('button', { name: 'Requests' }))
      expect(
        await screen.findByText(
          'Execution is in progress. Result availability is not yet guaranteed.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByText('Working')).toBeInTheDocument()
      executing.unmount()

      vi.unstubAllGlobals()
      stubGateway({ request: { request_id: 'request-1', state: 'COMPLETED' } })
      render(<App MapSurface={fakeMapSurface} />)
      await user.click(screen.getByRole('button', { name: 'Requests' }))
      expect(await screen.findByText(/no result identifier was provided/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Display on map' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Prepare download' })).toBeDisabled()
    },
  )

  it(
    'rejects incomplete and inverted request periods before calling the Gateway',
    { tags: ['unit'] },
    async () => {
      const fetchMock = stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Explore' }))
      await user.click(await screen.findByRole('button', { name: /NDVI/ }))
      await user.click(await screen.findByRole('button', { name: 'Configure request' }))
      await user.click(screen.getByRole('button', { name: 'Submit request' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Select a product, an AOI')
      await user.selectOptions(screen.getByLabelText('Saved AOI'), 'aoi-1')
      await user.type(screen.getByLabelText('Start month (UTC)'), '2026-03')
      await user.type(screen.getByLabelText('End month (UTC)'), '2026-02')
      await user.click(screen.getByRole('button', { name: 'Submit request' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('start month must be on or before')
      expect(
        fetchMock.mock.calls.filter(
          ([path, init]) =>
            path === '/api/v1/analysis-requests' &&
            (init as RequestInit | undefined)?.method === 'POST',
        ).length,
      ).toBe(0)
    },
  )

  it(
    'marks incomplete product metadata as unavailable instead of inventing values',
    { tags: ['unit'] },
    async () => {
      stubGateway({ product: { product_id: 'ndvi', name: 'Bare product' } })
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Explore' }))
      expect(await screen.findByText('Level unavailable')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Bare product/ }))
      expect(
        (await screen.findAllByText('No product description was supplied.')).length,
      ).toBeGreaterThan(0)
      expect(screen.getAllByText('Unavailable')).toHaveLength(7)
      expect(screen.queryByRole('checkbox', { name: 'Sentinel' })).not.toBeInTheDocument()
    },
  )

  it(
    'renders product illustrations and falls back when no preview is available',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      stubGateway()
      const withPreview = render(<App MapSurface={fakeMapSurface} />)
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      expect((await screen.findAllByAltText('NDVI illustrative preview')).length).toBeGreaterThan(0)
      withPreview.unmount()

      vi.unstubAllGlobals()
      stubGateway({ product: { ...PRODUCT, preview: null } })
      render(<App MapSurface={fakeMapSurface} />)
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      expect(
        await screen.findByRole('img', { name: 'No preview available for NDVI' }),
      ).toBeInTheDocument()
    },
  )

  it(
    'configures spatial resolution and source missions in the request payload',
    { tags: ['unit'] },
    async () => {
      const fetchMock = stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} />)

      await user.click(screen.getByRole('button', { name: 'Explore' }))
      await user.click(await screen.findByRole('button', { name: /NDVI/ }))
      await user.click(await screen.findByRole('button', { name: 'Configure request' }))
      expect(screen.getByRole('checkbox', { name: 'Sentinel' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Landsat' })).toBeInTheDocument()
      expect(screen.getByLabelText('Maximum allowed pixel size (m)')).toBeInTheDocument()
      await user.selectOptions(screen.getByLabelText('Saved AOI'), 'aoi-1')
      await user.type(screen.getByLabelText('Start month (UTC)'), '2026-01')
      await user.type(screen.getByLabelText('End month (UTC)'), '2026-02')
      await user.selectOptions(screen.getByLabelText('Maximum allowed pixel size (m)'), '20')
      await user.click(screen.getByRole('checkbox', { name: 'Sentinel' }))
      await user.click(screen.getByRole('button', { name: 'Submit request' }))

      const postCall = fetchMock.mock.calls.find(
        ([path, init]) =>
          path === '/api/v1/analysis-requests' &&
          (init as RequestInit | undefined)?.method === 'POST',
      )
      expect(postCall).toBeDefined()
      const body = JSON.parse(String((postCall?.[1] as RequestInit).body))
      expect(body).toMatchObject({
        product_id: 'ndvi',
        aoi_id: 'aoi-1',
        spatial_resolution_m: 20,
        sources: ['Sentinel'],
      })
    },
  )

  it(
    'polls active request states while the requests panel is open',
    { tags: ['unit'] },
    async () => {
      const fetchMock = stubGateway()
      const user = userEvent.setup()
      render(<App MapSurface={fakeMapSurface} pollIntervalMs={20} />)

      const listCalls = () =>
        fetchMock.mock.calls.filter(
          ([path, init]) =>
            path === '/api/v1/analysis-requests' &&
            (init as RequestInit | undefined)?.method === undefined,
        ).length
      const initialCalls = listCalls()

      await user.click(screen.getByRole('button', { name: 'Requests' }))
      await waitFor(() => expect(listCalls()).toBeGreaterThan(initialCalls))
      expect(screen.getByText('Active request states update automatically.')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Confirm execution' }))
      await screen.findByText('COMPLETED')
      expect(
        screen.queryByText('Active request states update automatically.'),
      ).not.toBeInTheDocument()
    },
  )
})
