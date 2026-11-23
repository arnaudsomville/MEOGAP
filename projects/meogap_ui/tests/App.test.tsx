import { render, screen, within } from '@testing-library/react'
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

const PRODUCT = {
  product_id: 'ndvi',
  name: 'NDVI',
  description: 'Vegetation index',
  level: 'L1',
  validation_status: 'unvalidated',
}

const PROPOSED_REQUEST = {
  request_id: 'request-1',
  state: 'PROPOSED',
  product_id: 'ndvi',
  aoi_id: 'aoi-1',
  start_month: '2026-01',
  end_month: '2026-02',
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

function fakeMapSurface({ drawing, focus, onMapClick, onAoiSelect, aois }: MapSurfaceProps) {
  return (
    <section aria-label="Test map">
      <output>{focus ? `${focus.lat},${focus.lng}` : 'No map focus'}</output>
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
  } = {},
) {
  const completed = { ...PROPOSED_REQUEST, state: 'COMPLETED', actual_credits: 2 }
  const request = options.request ?? PROPOSED_REQUEST
  const product = options.product ?? PRODUCT
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/v1/health')
      return gatewayResponse({ status: 'ok', service: 'gateway', version: '0.2.0' }, options.demo)
    if (path === '/api/v1/aois' && init?.method === 'POST')
      return gatewayResponse({ ...AOI, name: 'New area' })
    if (path === '/api/v1/aois') return gatewayResponse({ items: [AOI] })
    if (path === '/api/v1/aois/aoi-1') return gatewayResponse(AOI)
    if (path === '/api/v1/catalogue/products') return gatewayResponse({ items: [product] })
    if (path === '/api/v1/catalogue/products/ndvi') return gatewayResponse(product)
    if (path === '/api/v1/catalogue/products/ndvi/input-requirements')
      return gatewayResponse({ source: 'Sentinel-2' })
    if (path === '/api/v1/analysis-requests' && init?.method === 'POST')
      return gatewayResponse({ ...PROPOSED_REQUEST, request_id: 'request-new', state: 'PREPARING' })
    if (path === '/api/v1/analysis-requests') return gatewayResponse({ items: [request] })
    if (path === '/api/v1/analysis-requests/request-1/confirm') return gatewayResponse(completed)
    if (path === '/api/v1/analysis-requests/request-1/cancel')
      return gatewayResponse({ ...PROPOSED_REQUEST, state: 'CANCELLED' })
    if (path === '/api/v1/analysis-requests/request-1') return gatewayResponse(request)
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
      expect(await screen.findByText('Vegetation index')).toBeInTheDocument()
      expect(
        screen.getByText('Demo data: this workspace is not showing real EO processing.'),
      ).toBeInTheDocument()
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
        await screen.findByText('Map representation loaded from the Gateway.'),
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
      expect(await screen.findByRole('button', { name: 'Edit selected' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Edit selected' }))
      await user.click(screen.getByRole('button', { name: 'Clear boundary' }))
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
      expect(screen.getByText('Gateway unavailable')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      expect(screen.getByText('No products are available from the Gateway.')).toBeInTheDocument()
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
      expect(
        await screen.findByText('Preparing a proposal. Refresh to retrieve the current state.'),
      ).toBeInTheDocument()
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
      expect(await screen.findByText(/did not provide a result identifier/)).toBeInTheDocument()
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
        fetchMock.mock.calls.filter(([path]) => path === '/api/v1/analysis-requests').length,
      ).toBe(1)
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
      expect(await screen.findByText('Processing level unavailable')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Bare product/ }))
      expect(
        await screen.findByText('No product description was supplied by the Gateway.'),
      ).toBeInTheDocument()
      expect(screen.getAllByText('Unavailable')).toHaveLength(2)
    },
  )
})
