import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAnalysisRequest,
  estimateAnalysisRequest,
  getProductMissions,
  type AnalysisRequest,
  type ApiResponse,
  type Product,
} from '../../src/api/client'
import { useRequestComposer } from '../../src/app/useRequestComposer'

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>()
  return {
    ...actual,
    getProductMissions: vi.fn(),
    estimateAnalysisRequest: vi.fn(),
    createAnalysisRequest: vi.fn(),
  }
})

const PRODUCT: Product = {
  id: 'ndvi',
  name: 'NDVI',
  description: 'Vegetation index',
  level: 'L1',
  category: 'Vegetation',
  nativeResolution: '10 m',
  temporalResolution: '5 days',
  units: 'unitless',
  availability: 'DEMO',
  provenance: 'SYNTHETIC_DEMO',
  validationStatus: 'NOT_VALIDATED',
  documentationStatus: 'PLACEHOLDER',
  documentationUrl: null,
  maxPeriodMonths: 120,
  inputs: ['Red reflectance'],
  parameters: ['ndvi'],
  limitations: ['Demo.'],
  supportedSources: ['Sentinel'],
  supportedResolutionsM: [10, 20],
  supportedSpatialInputs: ['AOI'],
  supportedSelectionGeometries: ['POINT', 'POLYGON', 'RESULT_EXTENT'],
  supportedFrequencies: ['monthly', 'weekly'],
  preview: null,
}
const REQUEST: AnalysisRequest = {
  id: 'request-new',
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
const MISSIONS = {
  productId: 'ndvi',
  items: [
    {
      id: 'Sentinel',
      name: 'Sentinel',
      provider: 'ESA',
      instrument: 'MSI',
      nativeResolution: '10 m',
      temporalResolution: '5 days',
      availability: 'DEMO',
    },
  ],
}

function response<T>(data: T): ApiResponse<T> {
  return { data, isDemo: false }
}

function setup() {
  const focusAoi = vi.fn()
  const setPanel = vi.fn()
  const upsertRequest = vi.fn()
  const setError = vi.fn()
  const showError = vi.fn()
  const hook = renderHook(() =>
    useRequestComposer({
      products: [PRODUCT],
      sessionActive: true,
      panel: 'request',
      receive: <T,>(value: ApiResponse<T>) => value.data,
      showError,
      setError,
      setPanel,
      upsertRequest,
      focusAoi,
    }),
  )
  return { ...hook, focusAoi, setPanel, upsertRequest, setError, showError }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getProductMissions).mockResolvedValue(response(MISSIONS))
  vi.mocked(estimateAnalysisRequest).mockResolvedValue(
    response({
      productId: 'ndvi',
      aoiId: 'aoi-1',
      startMonth: '2026-01',
      endMonth: '2026-02',
      feasible: true,
      estimatedCredits: 3,
      currency: 'credits',
      balance: 12,
      balanceAvailable: true,
      admission: 'ADMITTED',
      conditions: [],
      limitations: [],
    }),
  )
  vi.mocked(createAnalysisRequest).mockResolvedValue(response(REQUEST))
})

describe('useRequestComposer', () => {
  it('loads missions and fills the form from the request action', { tags: ['unit'] }, async () => {
    const hook = setup()
    await act(async () => {
      hook.result.current.openRequest('ndvi')
    })
    await waitFor(() => expect(hook.result.current.missions).toHaveLength(1))
    expect(hook.result.current.requestSources).toEqual(['Sentinel'])
    expect(hook.setPanel).toHaveBeenCalledWith('request')
    act(() => hook.result.current.selectRequestAoi('aoi-1'))
    expect(hook.focusAoi).toHaveBeenCalledWith('aoi-1')
    act(() => hook.result.current.toggleRequestSource('Sentinel'))
    expect(hook.result.current.requestSources).toEqual([])
    act(() => hook.result.current.selectAllRequestSources())
    expect(hook.result.current.requestSources).toEqual(['Sentinel'])
  })

  it('estimates and submits a valid request', { tags: ['unit'] }, async () => {
    const hook = setup()
    act(() => {
      hook.result.current.openRequest('ndvi')
      hook.result.current.selectRequestAoi('aoi-1')
      hook.result.current.setStartMonth('2026-01')
      hook.result.current.setEndMonth('2026-02')
      hook.result.current.setRequestFrequency('monthly')
    })
    await waitFor(() => expect(hook.result.current.estimate?.admission).toBe('ADMITTED'))
    await act(async () => {
      await hook.result.current.submitRequest()
    })
    expect(createAnalysisRequest).toHaveBeenCalled()
    expect(hook.upsertRequest).toHaveBeenCalledWith(REQUEST)
    expect(hook.setPanel).toHaveBeenCalledWith('requests')
  })

  it('rejects incomplete, unsupported and unadmitted submissions', { tags: ['unit'] }, async () => {
    const hook = setup()
    await act(async () => {
      await hook.result.current.submitRequest()
    })
    expect(hook.setError).toHaveBeenCalledWith(expect.stringContaining('Select a product'))

    act(() => {
      hook.result.current.openRequest('ndvi')
      hook.result.current.selectRequestAoi('aoi-1')
      hook.result.current.setStartMonth('2026-02')
      hook.result.current.setEndMonth('2026-01')
    })
    await act(async () => {
      await hook.result.current.submitRequest()
    })
    expect(hook.setError).toHaveBeenCalledWith(expect.stringContaining('on or before'))

    hook.unmount()
    vi.mocked(estimateAnalysisRequest).mockResolvedValue(
      response({
        productId: 'ndvi',
        aoiId: 'aoi-1',
        startMonth: '2026-01',
        endMonth: '2026-02',
        feasible: false,
        estimatedCredits: 3,
        currency: 'credits',
        balance: 0,
        balanceAvailable: true,
        admission: 'INSUFFICIENT_CREDITS',
        conditions: [],
        limitations: [],
      }),
    )
    const insufficient = setup()
    act(() => {
      insufficient.result.current.openRequest('ndvi')
      insufficient.result.current.selectRequestAoi('aoi-1')
      insufficient.result.current.setStartMonth('2026-01')
      insufficient.result.current.setEndMonth('2026-02')
      insufficient.result.current.setRequestFrequency('monthly')
    })
    await waitFor(() =>
      expect(insufficient.result.current.estimate?.admission).toBe('INSUFFICIENT_CREDITS'),
    )
    await act(async () => {
      await insufficient.result.current.submitRequest()
    })
    expect(insufficient.setError).toHaveBeenCalledWith(
      'The current credit balance cannot admit this request.',
    )
  })

  it('reports mission loading errors', { tags: ['unit'] }, async () => {
    vi.mocked(getProductMissions).mockRejectedValueOnce(new Error('offline'))
    const hook = setup()
    await act(async () => {
      hook.result.current.openRequest('ndvi')
    })
    await waitFor(() => expect(hook.result.current.missionsError).toBe('offline'))
  })
})
