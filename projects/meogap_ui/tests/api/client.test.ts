import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHealth } from '../../src/api/client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getHealth', () => {
  it('returns the parsed health payload', async () => {
    const payload = { status: 'ok', core_version: '0.1.0' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => payload })),
    )

    await expect(getHealth()).resolves.toEqual(payload)
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    )

    await expect(getHealth()).rejects.toThrow('Health request failed with status 503')
  })
})
