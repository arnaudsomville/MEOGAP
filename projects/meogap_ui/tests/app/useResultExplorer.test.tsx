import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDelivery,
  getDelivery,
  getResult,
  getResultMap,
  queryResultSeries,
  type AnalysisRequest,
  type ApiResponse,
  type ResultDetail,
  type ResultMap,
  type SeriesResponse,
} from '../../src/api/client'
import { useResultExplorer } from '../../src/app/useResultExplorer'

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>()
  return {
    ...actual,
    getResultMap: vi.fn(),
    getResult: vi.fn(),
    queryResultSeries: vi.fn(),
    createDelivery: vi.fn(),
    getDelivery: vi.fn(),
  }
})

const REQUEST: AnalysisRequest = {
  id: 'request-1',
  state: 'succeeded',
  productId: 'ndvi',
  aoiId: 'aoi-1',
  aoiName: 'Toulouse',
  sourceAoiRevision: 1,
  geometrySnapshot: {
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
  startMonth: '2026-01',
  endMonth: '2026-02',
  requestedSources: [],
  requestedSpatialResolutionM: null,
  temporalFrequency: 'monthly',
  provenance: 'SYNTHETIC_DEMO',
  estimatedCredits: 3,
  actualCredits: 2,
  resultId: 'result-1',
  message: null,
  failureStage: null,
}
const RESULT_MAP: ResultMap = {
  url: '/demo-assets/ndvi/map.png',
  bounds: [
    { lat: 43.56, lng: 1.38 },
    { lat: 43.66, lng: 1.49 },
  ],
  requestId: 'request-1',
  productId: 'ndvi',
  resultVersion: '1',
  units: 'unitless',
  provenance: 'SYNTHETIC_DEMO',
  validationStatus: 'NOT_VALIDATED',
  qualityStatus: 'UNKNOWN',
  qualityNote: 'None.',
  legend: null,
  geotiffUrl: null,
  frames: [
    {
      id: 'frame-1',
      url: '/demo-assets/ndvi/frame-1.png',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      label: '2026-01',
      visualPeriodStart: '2025-06-01',
      visualPeriodEnd: '2025-07-31',
      isReusedVisual: true,
    },
  ],
  isDemo: true,
}
const RESULT_DETAIL: ResultDetail = {
  id: 'result-1',
  requestId: 'request-1',
  productId: 'ndvi',
  productName: 'NDVI',
  resultVersion: '1',
  aoiName: 'Toulouse',
  geometry: REQUEST.geometrySnapshot as ResultDetail['geometry'],
  startMonth: '2026-01',
  endMonth: '2026-02',
  units: 'unitless',
  temporalFrequency: 'monthly',
  provenance: 'SYNTHETIC_DEMO',
  availableParameters: [
    { name: 'ndvi', label: 'NDVI', units: 'unitless' },
    { name: 'coverage', label: 'COVERAGE', units: 'fraction' },
  ],
  validationStatus: 'NOT_VALIDATED',
  qualityStatus: 'UNKNOWN',
  qualityNote: 'None.',
  provenanceNote: 'SYNTHETIC_DEMO.',
  isDemo: true,
}
const SERIES: SeriesResponse = {
  resultId: 'result-1',
  productId: 'ndvi',
  geometryWkt: 'POINT(1.44 43.6)',
  crs: 'EPSG:4326',
  selectionType: 'Point',
  aggregationMethod: 'point_sample',
  selectionAreaKm2: 0,
  units: 'unitless',
  availableParameters: RESULT_DETAIL.availableParameters,
  selectedParameters: ['ndvi', 'coverage'],
  qualityStatus: 'PARTIAL',
  qualityNote: 'Demo.',
  coverage: null,
  provenance: 'SYNTHETIC_DEMO',
  isDemo: true,
  note: 'Demo.',
  points: [
    {
      parameter: 'ndvi',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      value: 0.4,
      unit: 'unitless',
      state: 'VALID',
      qualityStatus: 'VALID',
      coverage: null,
      note: null,
    },
    {
      parameter: 'coverage',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      value: null,
      unit: 'fraction',
      state: 'MISSING',
      qualityStatus: 'UNKNOWN',
      coverage: null,
      note: null,
    },
  ],
}

function response<T>(data: T): ApiResponse<T> {
  return { data, isDemo: false }
}

function setup() {
  const focusBounds = vi.fn()
  const setError = vi.fn()
  const showError = vi.fn()
  const hook = renderHook(() =>
    useResultExplorer({
      receive: <T,>(value: ApiResponse<T>) => value.data,
      showError,
      setError,
      focusBounds,
    }),
  )
  return { ...hook, focusBounds, setError, showError }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getResultMap).mockResolvedValue(response(RESULT_MAP))
  vi.mocked(getResult).mockResolvedValue(response(RESULT_DETAIL))
  vi.mocked(queryResultSeries).mockResolvedValue(response(SERIES))
  vi.mocked(createDelivery).mockResolvedValue(
    response({
      id: 'delivery-1',
      kind: 'final_product',
      state: 'PREPARING',
      downloadUrl: null,
      message: null,
    }),
  )
  vi.mocked(getDelivery).mockResolvedValue(
    response({
      id: 'delivery-1',
      kind: 'final_product',
      state: 'READY',
      downloadUrl: 'https://example.test/result.geojson',
      message: 'Ready.',
    }),
  )
})

describe('useResultExplorer', () => {
  it('displays a result and manages point selections and series', { tags: ['unit'] }, async () => {
    const hook = setup()
    await act(async () => {
      await hook.result.current.displayResult(REQUEST)
    })
    expect(hook.result.current.resultMap?.requestId).toBe('request-1')
    expect(hook.result.current.resultFrames).toHaveLength(1)
    expect(hook.focusBounds).toHaveBeenCalled()

    act(() => hook.result.current.startPointSelection())
    act(() => hook.result.current.handleResultClick({ lat: 43.6, lng: 1.44 }))
    expect(hook.result.current.selectionPoint).toEqual({ lat: 43.6, lng: 1.44 })
    expect(hook.result.current.hasSelection).toBe(true)

    await act(async () => {
      await hook.result.current.loadSeries(true)
    })
    expect(queryResultSeries).toHaveBeenCalledWith(
      'result-1',
      expect.objectContaining({ geometryWkt: 'POINT(1.44 43.6)', crs: 'EPSG:4326' }),
    )
    expect(hook.result.current.series).not.toBeNull()
    expect(hook.result.current.filteredSeriesPoints).toHaveLength(2)
    act(() => hook.result.current.toggleParameter('coverage'))
    expect(hook.result.current.selectedParameters).toEqual(['ndvi'])
    act(() => hook.result.current.toggleParameter('ndvi'))
    expect(hook.result.current.selectedParameters).toEqual(['ndvi'])
  })

  it(
    'manages polygon, reuse, result geometry and undo selections',
    { tags: ['unit'] },
    async () => {
      const hook = setup()
      await act(async () => {
        await hook.result.current.displayResult(REQUEST)
      })
      act(() => hook.result.current.startPolygonSelection())
      act(() => hook.result.current.handleResultClick({ lat: 43.58, lng: 1.42 }))
      act(() => hook.result.current.handleResultClick({ lat: 43.58, lng: 1.44 }))
      act(() => hook.result.current.handleResultClick({ lat: 43.6, lng: 1.44 }))
      expect(hook.result.current.selectionVertices).toHaveLength(3)
      act(() => hook.result.current.undoSelectionVertex())
      expect(hook.result.current.selectionVertices).toHaveLength(2)
      act(() => hook.result.current.reuseRequestAoi())
      expect(hook.result.current.selectionSource).toBe('request_aoi')
      act(() => hook.result.current.useResultGeometry())
      expect(hook.result.current.selectionSource).toBe('result_geometry')
      act(() => hook.result.current.clearSelection())
      expect(hook.result.current.selectionPoint).toBeNull()
      expect(hook.result.current.chartOpen).toBe(false)
    },
  )

  it(
    'rejects clicks outside the result and reports series errors',
    { tags: ['unit'] },
    async () => {
      const hook = setup()
      await act(async () => {
        await hook.result.current.displayResult(REQUEST)
      })
      act(() => hook.result.current.startPointSelection())
      act(() => hook.result.current.handleResultClick({ lat: 44, lng: 2 }))
      expect(hook.setError).toHaveBeenCalledWith(
        'The selected position is outside the displayed result.',
      )

      vi.mocked(queryResultSeries).mockRejectedValueOnce(new Error('Series unavailable'))
      act(() => hook.result.current.startPointSelection())
      act(() => hook.result.current.handleResultClick({ lat: 43.6, lng: 1.44 }))
      await act(async () => {
        await hook.result.current.loadSeries(true)
      })
      expect(hook.result.current.seriesError).toBe('Series unavailable')
      expect(hook.result.current.chartOpen).toBe(false)
    },
  )

  it('creates and refreshes deliveries', { tags: ['unit'] }, async () => {
    const hook = setup()
    await act(async () => {
      await hook.result.current.requestDelivery(REQUEST, 'final_product')
    })
    expect(hook.result.current.deliveries['request-1'].state).toBe('PREPARING')
    await act(async () => {
      await hook.result.current.refreshDelivery('request-1', 'delivery-1')
    })
    expect(hook.result.current.deliveries['request-1'].state).toBe('READY')
    expect(createDelivery).toHaveBeenCalled()
    expect(getDelivery).toHaveBeenCalled()
  })

  it('resets the explorer state', { tags: ['unit'] }, async () => {
    const hook = setup()
    await act(async () => {
      await hook.result.current.displayResult(REQUEST)
    })
    act(() => hook.result.current.reset())
    await waitFor(() => expect(hook.result.current.resultMap).toBeNull())
    expect(hook.result.current.displayedRequest).toBeNull()
  })
})
