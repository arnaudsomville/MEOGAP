import Ajv2020 from 'ajv/dist/2020.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getHealth,
  parseApiError,
  parseHealth,
  type ApiError,
  type Health,
} from '../../src/api/client'
import { loadContract } from './contracts'

const contract = loadContract() as {
  openapi: string
  info: { title: string }
  paths: Record<string, Record<string, unknown>>
  components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> }
  security: unknown[]
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const ajv = new Ajv2020({ allErrors: true, strict: false })
ajv.addSchema(contract, 'gateway')

const validateHealth = ajv.getSchema('gateway#/components/schemas/HealthResponse')
const validateError = ajv.getSchema('gateway#/components/schemas/ErrorResponse')
const validateProduct = ajv.getSchema('gateway#/components/schemas/ProductResponse')
const validateCreateRequest = ajv.getSchema(
  'gateway#/components/schemas/AnalysisRequestCreateRequest',
)
const validateMissions = ajv.getSchema('gateway#/components/schemas/ProductMissionsResponse')
const validateEstimate = ajv.getSchema('gateway#/components/schemas/CostEstimateResponse')
const validateSeriesRequest = ajv.getSchema('gateway#/components/schemas/ResultSeriesQueryRequest')
const validateSeries = ajv.getSchema('gateway#/components/schemas/ResultSeriesQueryResponse')
const validateResult = ajv.getSchema('gateway#/components/schemas/ResultDetailResponse')
const validateAccount = ajv.getSchema('gateway#/components/schemas/AccountResponse')
const validateDelivery = ajv.getSchema('gateway#/components/schemas/DeliveryResponse')
const validateResultMap = ajv.getSchema('gateway#/components/schemas/ResultMapResponse')

if (
  !validateHealth ||
  !validateError ||
  !validateProduct ||
  !validateCreateRequest ||
  !validateMissions ||
  !validateEstimate ||
  !validateSeriesRequest ||
  !validateSeries ||
  !validateResult ||
  !validateAccount ||
  !validateDelivery ||
  !validateResultMap
) {
  throw new Error('The reference contract is missing a shared schema.')
}

describe('REST reference contract', () => {
  it('is a committed OpenAPI 3.1 document', { tags: ['contract'] }, () => {
    expect(contract.openapi).toBe('3.1.0')
    expect(contract.info.title).toBe('MEOGAP Gateway')
  })

  it('declares bearer security and a public health route', { tags: ['contract'] }, () => {
    expect(contract.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    })
    expect(contract.security).toEqual([{ bearerAuth: [] }])
    expect(contract.paths['/api/v1/health'].get).toMatchObject({ security: [] })
  })

  it('accepts the UI health payload', { tags: ['contract'] }, () => {
    const payload: Health = { status: 'ok', service: 'gateway', version: '0.1.0' }
    expect(validateHealth(payload)).toBe(true)
  })

  it('accepts the UI error payload', { tags: ['contract'] }, () => {
    const payload: ApiError = {
      code: 'NOT_IMPLEMENTED',
      message: 'Not implemented.',
      service: 'gateway',
      operation: 'gateway_list_products',
    }
    expect(validateError(payload)).toBe(true)
  })

  it('rejects an error payload missing a required field', { tags: ['contract'] }, () => {
    const payload = {
      message: 'Not implemented.',
      service: 'gateway',
      operation: 'gateway_list_products',
    }
    expect(validateError(payload)).toBe(false)
  })

  it('rejects a health payload with an unexpected field', { tags: ['contract'] }, () => {
    const payload = { status: 'ok', service: 'gateway', version: '0.1.0', core_version: '0.1.0' }
    expect(validateHealth(payload)).toBe(false)
  })

  it('parses a valid health payload at runtime', { tags: ['contract'] }, () => {
    expect(parseHealth({ status: 'ok', service: 'gateway', version: '0.1.0' })).toEqual({
      status: 'ok',
      service: 'gateway',
      version: '0.1.0',
    })
  })

  it('rejects a health payload with an incompatible type', { tags: ['contract'] }, () => {
    expect(() => parseHealth({ status: 200, service: 'gateway', version: '0.1.0' })).toThrow(
      'Invalid payload: status must be a string',
    )
  })

  it('rejects a health payload with a missing field', { tags: ['contract'] }, () => {
    expect(() => parseHealth({ status: 'ok', version: '0.1.0' })).toThrow('Invalid payload')
  })

  it('parses a valid API error payload at runtime', { tags: ['contract'] }, () => {
    expect(
      parseApiError({
        code: 'NOT_IMPLEMENTED',
        message: 'Not implemented.',
        service: 'gateway',
        operation: 'gateway_list_products',
      }),
    ).toEqual({
      code: 'NOT_IMPLEMENTED',
      message: 'Not implemented.',
      service: 'gateway',
      operation: 'gateway_list_products',
    })
  })

  it('rejects an API error payload with a missing field', { tags: ['contract'] }, () => {
    expect(() =>
      parseApiError({
        message: 'Not implemented.',
        service: 'gateway',
        operation: 'gateway_list_products',
      }),
    ).toThrow('Invalid payload')
  })

  it('accepts product preview and controlled source metadata', { tags: ['contract'] }, () => {
    const payload = {
      product_id: 'ndvi',
      name: 'NDVI',
      description: 'Vegetation index',
      level: 'L1',
      category: 'Vegetation',
      native_resolution: '10 m',
      temporal_resolution: '5 days',
      units: 'unitless',
      availability: 'DEMO',
      validation_status: 'NOT_VALIDATED',
      inputs: ['Red reflectance'],
      parameters: [],
      limitations: ['Deterministic M0 descriptor.'],
      supported_sources: ['Sentinel', 'Landsat'],
      supported_resolutions_m: [10, 20],
      supported_spatial_inputs: ['AOI', 'POI', 'LOI'],
      supported_frequencies: ['monthly', 'semimonthly', 'weekly', 'three_day', 'two_day', 'daily'],
      max_period_months: 120,
      documentation_status: 'PLACEHOLDER',
      documentation_url: null,
      preview: {
        url: 'data:image/svg+xml,preview',
        alt: 'NDVI illustrative preview',
        attribution: 'MEOGAP synthetic illustration',
      },
    }
    expect(validateProduct(payload)).toBe(true)
    expect(validateProduct({ ...payload, supported_sources: ['Unknown mission'] })).toBe(false)
    expect(validateProduct({ ...payload, preview: null })).toBe(true)
  })

  it('accepts constrained request configuration', { tags: ['contract'] }, () => {
    const payload = {
      product_id: 'ndvi',
      aoi_id: 'aoi-1',
      period: { start_month: '2026-01', end_month: '2026-02' },
      spatial_resolution_m: 20,
      sources: ['Sentinel', 'Landsat'],
      temporal_frequency: 'monthly',
    }
    expect(validateCreateRequest(payload)).toBe(true)
    expect(validateCreateRequest({ ...payload, sources: ['Unknown mission'] })).toBe(false)
    expect(validateCreateRequest({ ...payload, spatial_resolution_m: 0 })).toBe(false)
    expect(validateCreateRequest({ ...payload, temporal_frequency: 'hourly' })).toBe(false)
  })

  it(
    'fails the real consumer when the health response drifts',
    { tags: ['contract'] },
    async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ status: 'ok', service: 'gateway', version: 1 }),
        })),
      )
      await expect(getHealth()).rejects.toThrow('Invalid payload: version must be a string')
    },
  )
  it(
    'accepts extended scientific metadata, series and archive schemas',
    { tags: ['contract'] },
    () => {
      expect(
        validateMissions({
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
        }),
      ).toBe(true)
      expect(
        validateEstimate({
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
        }),
      ).toBe(true)
      expect(
        validateSeriesRequest({
          geometry_wkt: 'POINT(1.44 43.6)',
          crs: 'EPSG:4326',
          period: { start_month: '2026-01', end_month: '2026-02' },
        }),
      ).toBe(true)
      expect(
        validateSeries({
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
              period_start: '2026-01-01',
              period_end: '2026-01-31',
              value: 0,
              unit: 'unitless',
              state: 'VALID',
              quality_status: 'VALID',
              coverage: null,
              note: null,
            },
          ],
        }),
      ).toBe(true)
      expect(
        validateResult({
          result_id: 'result-1',
          request_id: 'request-1',
          product_id: 'ndvi',
          product_name: 'NDVI',
          result_version: '1',
          aoi_name: 'Toulouse',
          geometry_snapshot: {
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
          start_month: '2026-01',
          end_month: '2026-02',
          units: 'unitless',
          temporal_frequency: 'monthly',
          validation_status: 'NOT_VALIDATED',
          quality_status: 'PARTIAL',
          quality_note: 'Demo.',
          provenance_note: 'Demo.',
          is_demo: true,
        }),
      ).toBe(true)
      expect(
        validateAccount({
          user_id: 'demo-user',
          display_name: 'MEOGAP demo user',
          session_status: 'AUTHENTICATED',
        }),
      ).toBe(true)
      expect(
        validateDelivery({
          delivery_id: 'delivery-1',
          kind: 'dependency_archive',
          state: 'READY',
          download_url: 'data:application/geo+json;base64,abc',
          message: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
      ).toBe(true)
    },
  )

  it(
    'rejects unsupported CRS and selection schemas through the contract',
    { tags: ['contract'] },
    () => {
      expect(
        validateSeriesRequest({
          geometry_wkt: 'POINT(1.44 43.6)',
          crs: '',
          period: { start_month: '2026-01', end_month: '2026-02' },
        }),
      ).toBe(false)
      expect(
        validateDelivery({
          delivery_id: 'delivery-1',
          state: 'READY',
          download_url: null,
          message: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
      ).toBe(false)
    },
  )
  it('accepts a georeferenced result map with colour-map metadata', { tags: ['contract'] }, () => {
    expect(
      validateResultMap({
        url: '/demo-assets/ndvi/toulouse-ndvi-2025.png',
        bounds: [
          [43.56, 1.38],
          [43.66, 1.49],
        ],
        kind: 'DEMO_NDVI_STATIC',
        note: 'Static georeferenced demonstration NDVI.',
        result_id: 'result-1',
        request_id: 'request-1',
        product_id: 'ndvi',
        result_version: '1',
        units: 'unitless',
        validation_status: 'NOT_VALIDATED',
        quality_status: 'PARTIAL',
        quality_note: 'Cloud-masked demo raster.',
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
      }),
    ).toBe(true)
  })
})
