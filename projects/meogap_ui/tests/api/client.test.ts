import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHealth } from '../../src/api/client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getHealth', () => {
  it('returns the parsed health payload', { tags: ['unit'] }, async () => {
    const payload = { status: 'ok', service: 'gateway', version: '0.1.0' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => payload })),
    )

    await expect(getHealth()).resolves.toEqual(payload)
  })

  it('throws the API error message when the response is not ok', { tags: ['unit'] }, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({
          code: 'UNAVAILABLE',
          message: 'down',
          service: 'gateway',
          operation: 'gateway_health',
        }),
      })),
    )

    await expect(getHealth()).rejects.toThrow('down')
  })

  it('rejects a health payload with an incompatible type', { tags: ['unit'] }, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 200, service: 'gateway', version: '0.1.0' }),
      })),
    )

    await expect(getHealth()).rejects.toThrow('Invalid payload: status must be a string')
  })

  it('rejects a health payload with an unexpected field', { tags: ['unit'] }, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 'ok', service: 'gateway', version: '0.1.0', extra: true }),
      })),
    )

    await expect(getHealth()).rejects.toThrow('Invalid payload')
  })
})
