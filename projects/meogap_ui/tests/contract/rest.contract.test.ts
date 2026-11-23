import Ajv2020 from 'ajv/dist/2020.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ApiError, Health } from '../../src/api/client'

const here = dirname(fileURLToPath(import.meta.url))
const contractPath = resolve(here, '../../../meogap_interfaces/rest/gat.openapi.json')
const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as {
  openapi: string
  info: { title: string }
  paths: Record<string, Record<string, unknown>>
  components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> }
  security: unknown[]
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
ajv.addSchema(contract, 'gat')

const validateHealth = ajv.getSchema('gat#/components/schemas/HealthResponse')
const validateError = ajv.getSchema('gat#/components/schemas/ErrorResponse')

if (!validateHealth || !validateError) {
  throw new Error('The reference contract is missing a shared schema.')
}

describe('REST reference contract', () => {
  it('is a committed OpenAPI 3.1 document', { tags: ['contract'] }, () => {
    expect(contract.openapi).toBe('3.1.0')
    expect(contract.info.title).toBe('MEOGAP Gateway (GAT)')
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
    const payload: Health = { status: 'ok', service: 'gat', version: '0.1.0' }
    expect(validateHealth(payload)).toBe(true)
  })

  it('accepts the UI error payload', { tags: ['contract'] }, () => {
    const payload: ApiError = {
      code: 'NOT_IMPLEMENTED',
      message: 'Not implemented.',
      service: 'gat',
      operation: 'gat_list_products',
    }
    expect(validateError(payload)).toBe(true)
  })

  it('rejects an error payload missing a required field', { tags: ['contract'] }, () => {
    const payload = { message: 'Not implemented.', service: 'gat', operation: 'gat_list_products' }
    expect(validateError(payload)).toBe(false)
  })

  it('rejects a health payload with an unexpected field', { tags: ['contract'] }, () => {
    const payload = { status: 'ok', service: 'gat', version: '0.1.0', core_version: '0.1.0' }
    expect(validateHealth(payload)).toBe(false)
  })
})
