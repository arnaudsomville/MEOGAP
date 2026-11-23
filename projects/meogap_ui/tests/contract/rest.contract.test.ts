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

if (!validateHealth || !validateError || !validateProduct || !validateCreateRequest) {
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
      availability: 'DEMO',
      validation_status: 'NOT_VALIDATED',
      inputs: ['Red reflectance'],
      parameters: [],
      limitations: ['Deterministic M0 descriptor.'],
      supported_sources: ['Sentinel', 'Landsat'],
      supported_resolutions_m: [10, 20],
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
    }
    expect(validateCreateRequest(payload)).toBe(true)
    expect(validateCreateRequest({ ...payload, sources: ['Unknown mission'] })).toBe(false)
    expect(validateCreateRequest({ ...payload, spatial_resolution_m: 0 })).toBe(false)
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
})
