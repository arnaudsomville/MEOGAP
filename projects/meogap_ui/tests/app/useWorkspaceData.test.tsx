import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAccount,
  getCreditBalance,
  listAnalysisRequests,
  listAois,
  listProducts,
  type AnalysisRequest,
} from '../../src/api/client'
import { useWorkspaceData } from '../../src/app/useWorkspaceData'

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>()
  return {
    ...actual,
    listProducts: vi.fn(),
    listAois: vi.fn(),
    listAnalysisRequests: vi.fn(),
    getCreditBalance: vi.fn(),
    getAccount: vi.fn(),
  }
})

const REQUEST: AnalysisRequest = {
  id: 'request-1',
  state: 'queued',
  productId: 'ndvi',
  aoiId: 'aoi-1',
  aoiName: 'Toulouse',
  sourceAoiRevision: 1,
  geometrySnapshot: null,
  startMonth: '2026-01',
  endMonth: '2026-02',
  requestedSources: [],
  requestedSpatialResolutionM: null,
  temporalFrequency: 'monthly',
  provenance: 'SYNTHETIC_DEMO',
  estimatedCredits: 3,
  actualCredits: null,
  resultId: null,
  message: null,
  failureStage: null,
}

function response<T>(data: T, isDemo = false) {
  return { data, isDemo }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listProducts).mockResolvedValue(response([]))
  vi.mocked(listAois).mockResolvedValue(response([]))
  vi.mocked(listAnalysisRequests).mockResolvedValue(response([REQUEST]))
  vi.mocked(getCreditBalance).mockResolvedValue(response({ balance: 12, unit: 'credits' }))
  vi.mocked(getAccount).mockResolvedValue(
    response({ userId: 'demo-user', displayName: 'Demo', sessionStatus: 'AUTHENTICATED' }),
  )
})

describe('useWorkspaceData', () => {
  it('loads session data and exposes demo provenance', { tags: ['unit'] }, async () => {
    vi.mocked(listProducts).mockResolvedValueOnce(response([], true))
    const hook = renderHook(() => useWorkspaceData({ sessionActive: true, pollIntervalMs: 60_000 }))
    await waitFor(() => expect(hook.result.current.isLoading.catalogue).toBe(false))
    expect(hook.result.current.isDemo).toBe(true)
    expect(hook.result.current.requests).toEqual([REQUEST])
    expect(hook.result.current.creditBalance?.balance).toBe(12)
    expect(hook.result.current.account?.userId).toBe('demo-user')
  })

  it('records load errors without discarding previous state', { tags: ['unit'] }, async () => {
    const hook = renderHook(() => useWorkspaceData({ sessionActive: true, pollIntervalMs: 60_000 }))
    await waitFor(() => expect(hook.result.current.requests).toHaveLength(1))

    vi.mocked(listProducts).mockRejectedValueOnce(new Error('catalogue'))
    vi.mocked(listAois).mockRejectedValueOnce(new Error('aois'))
    vi.mocked(listAnalysisRequests).mockRejectedValueOnce(new Error('requests'))
    vi.mocked(getCreditBalance).mockRejectedValueOnce(new Error('credits'))
    vi.mocked(getAccount).mockRejectedValueOnce(new Error('account'))
    await act(async () => {
      await hook.result.current.loadCatalogue()
      await hook.result.current.loadAois()
      await hook.result.current.loadRequests()
      await hook.result.current.loadAccount()
      await hook.result.current.refreshBalance()
    })
    expect(hook.result.current.loadErrors).toEqual({
      catalogue: true,
      aois: true,
      requests: true,
    })
    expect(hook.result.current.error).toContain('could not be loaded')
    expect(hook.result.current.isLoading.balance).toBe(false)
  })

  it('inserts and replaces requests by identifier', { tags: ['unit'] }, async () => {
    const hook = renderHook(() => useWorkspaceData({ sessionActive: true, pollIntervalMs: 60_000 }))
    await waitFor(() => expect(hook.result.current.requests).toHaveLength(1))
    act(() => hook.result.current.upsertRequest({ ...REQUEST, state: 'processing' }))
    expect(hook.result.current.requests[0].state).toBe('processing')
    act(() => hook.result.current.upsertRequest({ ...REQUEST, id: 'request-2', state: 'queued' }))
    expect(hook.result.current.requests).toHaveLength(2)
  })

  it('does not load when the session is inactive', { tags: ['unit'] }, () => {
    renderHook(() => useWorkspaceData({ sessionActive: false, pollIntervalMs: 60_000 }))
    expect(listProducts).not.toHaveBeenCalled()
  })
})
