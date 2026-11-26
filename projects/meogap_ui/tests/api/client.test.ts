import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cancelAnalysisRequest,
  createAnalysisRequest,
  createAoi,
  createDelivery,
  deleteAoi,
  getAnalysisRequest,
  getAoi,
  getCreditBalance,
  getDelivery,
  getAccount,
  getHealth,
  getProduct,
  getProductMissions,
  getProductRequirements,
  getResult,
  getResultMap,
  listAnalysisRequests,
  listAois,
  listProducts,
  parseAccount,
  parseAnalysisRequest,
  parseAoi,
  parseAoiGeometry,
  parseAoiList,
  parseCostEstimate,
  parseCreditBalance,
  parseDelivery,
  parseProduct,
  parseProductMissions,
  parseResultDetail,
  parseResultMap,
  parseSeries,
  queryResultSeries,
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
  state: 'queued',
  product_id: 'ndvi',
  aoi_id: 'aoi-1',
  start_month: '2026-01',
  end_month: '2026-02',
  estimated_credits: 3,
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
        response({
          product_id: 'ndvi',
          inputs: ['Sentinel-2'],
          limitations: ['Demo only'],
          note: 'Deterministic M0 descriptor.',
        }),
        response({ items: [REQUEST] }),
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
      await expect(listAnalysisRequests()).resolves.toMatchObject({ data: [{ state: 'queued' }] })
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
      await expect(cancelAnalysisRequest('request-1')).resolves.toMatchObject({
        data: { state: 'queued' },
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
      expect(() => parseResultMap({ map_url: 4 })).toThrow('must be a string or null')
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
          state: 'succeeded',
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
      expect(parseCreditBalance({ balance: 0, unit: 'points' })).toEqual({
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

describe('extended Gateway client', () => {
  it('parses product scientific constraints and mission metadata', { tags: ['unit'] }, () => {
    const product = parseProduct({
      ...PRODUCT,
      native_resolution: '10 m',
      units: 'unitless',
      supported_spatial_inputs: ['AOI', 'POI', 'LOI', 'UNKNOWN'],
      supported_selection_geometries: ['POINT', 'POLYGON', 'RESULT_EXTENT', 'UNKNOWN'],
      supported_frequencies: [
        'monthly',
        'semimonthly',
        'weekly',
        'three_day',
        'two_day',
        'daily',
        'custom',
      ],
      max_period_months: 120,
      documentation_status: 'PLACEHOLDER',
      documentation_url: null,
      supported_sources: ['Sentinel'],
      supported_resolutions_m: [10, 20],
    })
    expect(product.units).toBe('unitless')
    expect(product.supportedSpatialInputs).toEqual(['AOI'])
    expect(product.supportedSelectionGeometries).toEqual(['POINT', 'POLYGON', 'RESULT_EXTENT'])
    expect(product.supportedFrequencies).toEqual([
      'monthly',
      'semimonthly',
      'weekly',
      'three_day',
      'two_day',
      'daily',
    ])
    expect(product.maxPeriodMonths).toBe(120)
    const missions = parseProductMissions({
      product_id: 'ndvi',
      items: [
        {
          source_id: 'Sentinel',
          name: 'Sentinel',
          provider: 'ESA',
          instrument: 'MSI',
          native_resolution: '10 m',
          temporal_resolution: '5 days',
          availability: 'DEMO',
        },
      ],
    })
    expect(missions.items[0].id).toBe('Sentinel')
  })

  it('parses cost estimates and rejects unsupported admission', { tags: ['unit'] }, () => {
    const payload = {
      product_id: 'ndvi',
      aoi_id: 'aoi-1',
      start_month: '2026-01',
      end_month: '2026-02',
      feasible: true,
      estimated_credits: 3,
      currency: 'credits',
      balance: 12,
      balance_available: true,
      admission: 'ADMITTED',
      conditions: [],
      limitations: [],
    }
    expect(parseCostEstimate(payload)).toMatchObject({ admission: 'ADMITTED', balance: 12 })
    expect(() => parseCostEstimate({ ...payload, admission: 'MAYBE' })).toThrow(
      'unsupported admission',
    )
    expect(() => parseCostEstimate({ ...payload, estimated_credits: null })).toThrow(
      'estimated_credits',
    )
  })

  it('parses result metadata, series and missing values distinctly', { tags: ['unit'] }, () => {
    const detail = parseResultDetail({
      result_id: 'result-1',
      request_id: 'request-1',
      product_id: 'ndvi',
      product_name: 'NDVI',
      result_version: '1',
      aoi_name: 'Toulouse',
      geometry_snapshot: AOI.geometry,
      start_month: '2026-01',
      end_month: '2026-02',
      units: 'unitless',
      validation_status: 'NOT_VALIDATED',
      quality_status: 'PARTIAL',
      quality_note: 'Synthetic.',
      provenance_note: 'Demo lineage.',
      is_demo: true,
    })
    expect(detail.id).toBe('result-1')
    expect(detail.isDemo).toBe(true)
    const series = parseSeries({
      result_id: 'result-1',
      product_id: 'ndvi',
      geometry_wkt: 'POINT(1.44 43.6)',
      crs: 'EPSG:4326',
      selection_type: 'Point',
      aggregation_method: 'point_sample',
      units: 'unitless',
      quality_status: 'PARTIAL',
      quality_note: 'Demo.',
      coverage: null,
      is_demo: true,
      note: 'Demo.',
      points: [
        {
          parameter: 'ndvi',
          period_start: '2026-01-01',
          period_end: '2026-01-31',
          value: 0,
          unit: 'unitless',
          state: 'VALID',
          quality_status: 'VALID',
          coverage: null,
          note: null,
        },
        {
          parameter: 'ndvi',
          period_start: '2026-02-01',
          period_end: '2026-02-28',
          value: null,
          unit: 'unitless',
          state: 'MISSING',
          quality_status: 'UNKNOWN',
          coverage: null,
          note: 'No observation.',
        },
      ],
    })
    expect(series.points[0].value).toBe(0)
    expect(series.points[1].value).toBeNull()
    expect(series.points[1].state).toBe('MISSING')
    expect(() =>
      parseSeries({
        result_id: 'result-1',
        product_id: 'ndvi',
        geometry_wkt: 'POINT(1.44 43.6)',
        crs: 'EPSG:4326',
        selection_type: 'LineString',
        aggregation_method: 'point_sample',
        units: 'unitless',
        quality_status: 'PARTIAL',
        quality_note: 'Demo.',
        coverage: null,
        is_demo: true,
        note: 'Demo.',
        points: [],
      }),
    ).toThrow('Point or Polygon')
  })

  it('parses account identity and delivery kind', { tags: ['unit'] }, () => {
    expect(
      parseAccount({ user_id: 'demo-user', display_name: 'Demo', session_status: 'AUTHENTICATED' }),
    ).toMatchObject({ userId: 'demo-user' })
    expect(
      parseDelivery({
        delivery_id: 'delivery-1',
        kind: 'dependency_archive',
        state: 'READY',
        download_url: 'data:application/geo+json;base64,abc',
      }),
    ).toMatchObject({ kind: 'dependency_archive' })
  })

  it(
    'posts WKT series requests and fetches missions, results and account',
    { tags: ['unit'] },
    async () => {
      const fetchMock = vi.fn(async (path: string) => {
        if (path === '/api/v1/catalogue/products/ndvi/missions')
          return response({ product_id: 'ndvi', items: [] })
        if (path === '/api/v1/account')
          return response({
            user_id: 'demo-user',
            display_name: 'Demo',
            session_status: 'AUTHENTICATED',
          })
        if (path === '/api/v1/results/result-1')
          return response({
            result_id: 'result-1',
            request_id: 'request-1',
            product_id: 'ndvi',
            product_name: 'NDVI',
            result_version: '1',
            aoi_name: 'Toulouse',
            geometry_snapshot: AOI.geometry,
            start_month: '2026-01',
            end_month: '2026-02',
            units: 'unitless',
            validation_status: 'NOT_VALIDATED',
            quality_status: 'PARTIAL',
            quality_note: 'Synthetic.',
            provenance_note: 'Demo lineage.',
            is_demo: true,
          })
        return response({
          result_id: 'result-1',
          product_id: 'ndvi',
          geometry_wkt: 'POINT(1.44 43.6)',
          crs: 'EPSG:4326',
          selection_type: 'Point',
          aggregation_method: 'point_sample',
          units: 'unitless',
          quality_status: 'PARTIAL',
          quality_note: 'Demo.',
          coverage: null,
          is_demo: true,
          note: 'Demo.',
          points: [],
        })
      })
      vi.stubGlobal('fetch', fetchMock)
      await getProductMissions('ndvi')
      await getResult('result-1')
      await getAccount()
      await queryResultSeries('result-1', {
        geometryWkt: 'POINT(1.44 43.6)',
        crs: 'EPSG:4326',
        startMonth: '2026-01',
        endMonth: '2026-02',
        parameters: ['quality'],
      })
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/results/result-1/series',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/catalogue/products/ndvi/missions',
        expect.any(Object),
      )
    },
  )
})

describe('temporal frequency contract', () => {
  const RESULT_DETAIL = {
    result_id: 'result-1',
    request_id: 'request-1',
    product_id: 'ndvi',
    product_name: 'NDVI',
    result_version: '1',
    aoi_name: 'Toulouse',
    geometry_snapshot: AOI.geometry,
    start_month: '2026-01',
    end_month: '2026-02',
    units: 'unitless',
    temporal_frequency: 'weekly',
    validation_status: 'NOT_VALIDATED',
    quality_status: 'PARTIAL',
    quality_note: 'Synthetic.',
    provenance_note: 'Demo lineage.',
    is_demo: true,
  }

  it('parses retained temporal frequency from requests and results', { tags: ['unit'] }, () => {
    expect(
      parseAnalysisRequest({ ...REQUEST, temporal_frequency: 'semimonthly' }).temporalFrequency,
    ).toBe('semimonthly')
    expect(parseResultDetail(RESULT_DETAIL).temporalFrequency).toBe('weekly')
    expect(() => parseAnalysisRequest({ ...REQUEST, temporal_frequency: 'hourly' })).toThrow(
      'temporal_frequency',
    )
  })

  it(
    'transmits temporal frequency in estimate and creation payloads',
    { tags: ['unit'] },
    async () => {
      const fetchMock = vi.fn(async (_path: string, _init?: RequestInit) => {
        void _path
        void _init
        return response(REQUEST)
      })
      vi.stubGlobal('fetch', fetchMock)
      await createAnalysisRequest({
        productId: 'ndvi',
        aoiId: 'aoi-1',
        startMonth: '2026-01',
        endMonth: '2026-02',
        temporalFrequency: 'monthly',
      })
      const createCall = fetchMock.mock.calls.find(
        ([path, init]) =>
          path === '/api/v1/analysis-requests' &&
          (init as RequestInit | undefined)?.method === 'POST',
      )
      expect(JSON.parse(String((createCall?.[1] as RequestInit).body))).toMatchObject({
        temporal_frequency: 'monthly',
      })
    },
  )
})

describe('result map legend metadata', () => {
  it('parses colour-map legend metadata and GeoTIFF provenance', { tags: ['unit'] }, () => {
    const map = parseResultMap({
      url: '/demo-assets/ndvi/toulouse-ndvi-2025.png',
      bounds: [
        [43.56, 1.38],
        [43.66, 1.49],
      ],
      result_id: 'result-1',
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
      geotiff_url: '/demo-assets/ndvi/geotiff/toulouse-ndvi-2025.tif',
      frames: [
        {
          frame_id: 'result-1-frame-1',
          url: '/demo-assets/ndvi/toulouse-ndvi-2025-06-07.png',
          period_start: '2026-01-01',
          period_end: '2026-01-31',
          label: '2026-01',
          visual_period_start: '2025-06-01',
          visual_period_end: '2025-07-31',
          is_reused_visual: true,
        },
      ],
      is_demo: true,
    })
    expect(map.legend?.title).toBe('NDVI')
    expect(map.frames[0].periodStart).toBe('2026-01-01')
    expect(map.frames[0].isReusedVisual).toBe(true)
    expect(map.legend?.stops).toHaveLength(2)
    expect(map.geotiffUrl).toContain('.tif')
    expect(() =>
      parseResultMap({
        url: 'x',
        bounds: null,
        legend: { title: 'NDVI', units: 'unitless', min: 0, max: 1, stops: [] },
      }),
    ).toThrow('legend stops')
  })
})
