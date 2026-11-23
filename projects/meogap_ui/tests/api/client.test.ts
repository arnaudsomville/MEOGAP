import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cancelAnalysisRequest,
  confirmAnalysisRequest,
  createAnalysisRequest,
  createAoi,
  createDelivery,
  deleteAoi,
  getAnalysisRequest,
  getAoi,
  getCreditBalance,
  getDelivery,
  getHealth,
  getProduct,
  getProductRequirements,
  getResultMap,
  listAnalysisRequests,
  listAois,
  listProducts,
  parseAnalysisRequest,
  parseAoi,
  parseAoiGeometry,
  parseAoiList,
  parseCreditBalance,
  parseDelivery,
  parseProduct,
  parseResultMap,
  updateAoi,
} from '../../src/api/client'

const AOI = {
  aoi_id: 'aoi-1',
  name: 'Toulouse study area',
  description: null,
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

const PRODUCT = {
  product_id: 'ndvi',
  name: 'NDVI',
  description: 'Vegetation index',
  level: 'L1',
  validation_status: 'unvalidated',
}

const REQUEST = {
  request_id: 'request-1',
  state: 'PROPOSED',
  product_id: 'ndvi',
  aoi_id: 'aoi-1',
  start_month: '2026-01',
  end_month: '2026-02',
  proposal: { estimated_credits: 3 },
  result_id: 'result-1',
}

function response(payload: unknown, options: { status?: number; demo?: boolean } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (options.demo && name === 'X-MEOGAP-Demo' ? 'true' : null) },
    json: async () => payload,
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Gateway client', () => {
  it(
    'uses every public Gateway path and normalizes valid responses',
    { tags: ['unit'] },
    async () => {
      const responses = [
        response({ status: 'ok', service: 'gateway', version: '0.2.0' }, { demo: true }),
        response({ items: [AOI] }),
        response(AOI),
        response(AOI),
        response(AOI),
        response(undefined, { status: 204 }),
        response({ items: [PRODUCT] }),
        response(PRODUCT),
        response({ inputs: ['Sentinel-2'] }),
        response({ items: [REQUEST] }),
        response(REQUEST),
        response(REQUEST),
        response(REQUEST),
        response(REQUEST),
        response({ balance: 12, unit: 'credits' }),
        response({
          url: 'https://example.test/map.png',
          bounds: [
            [43.56, 1.38],
            [43.66, 1.49],
          ],
        }),
        response({ delivery_id: 'delivery-1', state: 'PREPARING' }),
        response({
          delivery_id: 'delivery-1',
          state: 'READY',
          download_url: 'https://example.test/file.zip',
        }),
      ]
      const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(
        async () => responses.shift() as Response,
      )
      vi.stubGlobal('fetch', fetchMock)

      await expect(getHealth()).resolves.toMatchObject({ data: { status: 'ok' }, isDemo: true })
      await expect(listAois()).resolves.toMatchObject({ data: [{ id: 'aoi-1' }] })
      await expect(getAoi('aoi 1')).resolves.toMatchObject({ data: { id: 'aoi-1' } })
      await expect(
        createAoi({ name: 'Toulouse study area', description: null, geometry: AOI.geometry }),
      ).resolves.toMatchObject({ data: { id: 'aoi-1' } })
      await expect(
        updateAoi('aoi-1', {
          name: 'Toulouse study area',
          description: null,
          geometry: AOI.geometry,
        }),
      ).resolves.toMatchObject({ data: { revision: 1 } })
      await expect(deleteAoi('aoi-1')).resolves.toMatchObject({ data: undefined })
      await expect(listProducts()).resolves.toMatchObject({ data: [{ id: 'ndvi' }] })
      await expect(getProduct('ndvi')).resolves.toMatchObject({ data: { name: 'NDVI' } })
      await expect(getProductRequirements('ndvi')).resolves.toMatchObject({
        data: { inputs: ['Sentinel-2'] },
      })
      await expect(listAnalysisRequests()).resolves.toMatchObject({ data: [{ state: 'PROPOSED' }] })
      await expect(getAnalysisRequest('request-1')).resolves.toMatchObject({
        data: { id: 'request-1' },
      })
      await expect(
        createAnalysisRequest({
          productId: 'ndvi',
          aoiId: 'aoi-1',
          startMonth: '2026-01',
          endMonth: '2026-02',
        }),
      ).resolves.toMatchObject({ data: { id: 'request-1' } })
      await expect(confirmAnalysisRequest('request-1')).resolves.toMatchObject({
        data: { state: 'PROPOSED' },
      })
      await expect(cancelAnalysisRequest('request-1')).resolves.toMatchObject({
        data: { state: 'PROPOSED' },
      })
      await expect(getCreditBalance()).resolves.toMatchObject({ data: { balance: 12 } })
      await expect(getResultMap('result-1')).resolves.toMatchObject({
        data: {
          bounds: [
            { lat: 43.56, lng: 1.38 },
            { lat: 43.66, lng: 1.49 },
          ],
        },
      })
      await expect(createDelivery('result-1')).resolves.toMatchObject({
        data: { state: 'PREPARING' },
      })
      await expect(getDelivery('delivery-1')).resolves.toMatchObject({ data: { state: 'READY' } })

      expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
        '/api/v1/health',
        '/api/v1/aois',
        '/api/v1/aois/aoi%201',
        '/api/v1/aois',
        '/api/v1/aois/aoi-1',
        '/api/v1/aois/aoi-1',
        '/api/v1/catalogue/products',
        '/api/v1/catalogue/products/ndvi',
        '/api/v1/catalogue/products/ndvi/input-requirements',
        '/api/v1/analysis-requests',
        '/api/v1/analysis-requests/request-1',
        '/api/v1/analysis-requests',
        '/api/v1/analysis-requests/request-1/confirm',
        '/api/v1/analysis-requests/request-1/cancel',
        '/api/v1/credits/balance',
        '/api/v1/results/result-1/map',
        '/api/v1/results/result-1/deliveries',
        '/api/v1/deliveries/delivery-1',
      ])
      expect(fetchMock.mock.calls[11][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({
          product_id: 'ndvi',
          aoi_id: 'aoi-1',
          period: { start_month: '2026-01', end_month: '2026-02' },
        }),
      })
    },
  )

  it(
    'rejects unsupported runtime payloads before they reach components',
    { tags: ['unit'] },
    () => {
      expect(() => parseAoiGeometry({ type: 'Point', coordinates: [1, 2] })).toThrow(
        'Polygon or MultiPolygon',
      )
      expect(() => parseProduct({ product_id: 'ndvi' })).toThrow('name or title')
      expect(() => parseAnalysisRequest({ request_id: 'request-1', state: 'WAITING' })).toThrow(
        'unsupported analysis request state',
      )
      expect(() => parseDelivery({ delivery_id: 'delivery-1', state: 'QUEUED' })).toThrow(
        'unsupported delivery state',
      )
      expect(() => parseCreditBalance({ balance: '12' })).toThrow('balance must be a finite number')
      expect(() => parseResultMap({ map_url: 4 })).toThrow('expected a string field')
    },
  )

  it(
    'accepts documented aliases, direct lists, multipolygons, and optional response fields',
    { tags: ['unit'] },
    () => {
      expect(parseAoiList([AOI])).toHaveLength(1)
      expect(parseAoiList({ aois: [AOI] })).toHaveLength(1)
      expect(
        parseAoi({
          ...AOI,
          aoi_id: undefined,
          id: 'aoi-alias',
          description: 'Optional description',
        }),
      ).toMatchObject({ id: 'aoi-alias', description: 'Optional description' })
      expect(
        parseAoiGeometry({ type: 'MultiPolygon', coordinates: [AOI.geometry.coordinates] }),
      ).toMatchObject({ type: 'MultiPolygon' })
      expect(
        parseProduct({
          id: 'product-alias',
          title: 'Alias product',
          summary: 'Summary',
          processing_level: 'L2',
          scientific_validation_status: 'unvalidated',
        }),
      ).toMatchObject({ id: 'product-alias', level: 'L2' })
      expect(
        parseAnalysisRequest({
          id: 'request-alias',
          state: 'COMPLETED',
          productId: 'product-alias',
          aoiId: 'aoi-alias',
          period_start: '2026-01',
          period_end: '2026-02',
          estimated_credits: 0,
          actual_cost: 0,
          reason: 'Finished',
        }),
      ).toMatchObject({ id: 'request-alias', estimatedCredits: 0, actualCredits: 0 })
      expect(
        parseResultMap({ url: 'https://example.test/map.png', bounds: 'not-a-bounds' }).bounds,
      ).toBeNull()
      expect(
        parseResultMap({ image_url: 'https://example.test/map.png', bounds: [[], [1, 2]] }).bounds,
      ).toBeNull()
      expect(
        parseDelivery({
          id: 'delivery-alias',
          state: 'READY',
          url: 'https://example.test/file.zip',
          reason: 'Ready',
        }),
      ).toMatchObject({ id: 'delivery-alias', downloadUrl: 'https://example.test/file.zip' })
      expect(parseCreditBalance({ credits: 0, currency: 'points' })).toEqual({
        balance: 0,
        unit: 'points',
      })
    },
  )

  it('uses the Gateway error envelope when an operation fails', { tags: ['unit'] }, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response(
          {
            code: 'UNAVAILABLE',
            message: 'Gateway is down',
            service: 'gateway',
            operation: 'gateway_health',
          },
          { status: 503 },
        ),
      ),
    )

    await expect(getHealth()).rejects.toThrow('Gateway is down')
  })

  it(
    'reports malformed Gateway errors and non-JSON responses without accepting them',
    { tags: ['unit'] },
    async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => response({ error: 'unstructured' }, { status: 500 })),
      )
      await expect(getHealth()).rejects.toThrow('API request failed with status 500')

      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            ({
              ok: true,
              status: 200,
              headers: { get: () => null },
              json: async () => {
                throw new Error('bad JSON')
              },
            }) as unknown as Response,
        ),
      )
      await expect(getHealth()).rejects.toThrow('did not contain JSON')
    },
  )
})
