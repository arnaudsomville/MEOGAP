import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisRequest, ResultDetail, ResultMap } from '../../src/api/client'
import { ResultInspector } from '../../src/components/ResultInspector'

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
  qualityNote: 'No observation quality is computed.',
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
    {
      id: 'frame-2',
      url: '/demo-assets/ndvi/frame-2.png',
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      label: '2026-02',
      visualPeriodStart: '2025-07-01',
      visualPeriodEnd: '2025-08-31',
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
  geometry: {
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
  units: 'unitless',
  temporalFrequency: 'monthly',
  provenance: 'SYNTHETIC_DEMO',
  availableParameters: [{ name: 'ndvi', label: 'NDVI', units: 'unitless' }],
  validationStatus: 'NOT_VALIDATED',
  qualityStatus: 'UNKNOWN',
  qualityNote: 'No observation quality is computed.',
  provenanceNote: 'SYNTHETIC_DEMO: no real source assets.',
  isDemo: true,
}

function renderInspector(overrides: Partial<Parameters<typeof ResultInspector>[0]> = {}) {
  const handlers = {
    setInspectorOpen: vi.fn(),
    onToggleResultVisible: vi.fn(),
    setResultFrameIndex: vi.fn(),
    onStartPoint: vi.fn(),
    onStartPolygon: vi.fn(),
    onReuseRequestAoi: vi.fn(),
    onUseResultGeometry: vi.fn(),
    onClearSelection: vi.fn(),
    onUndoSelectionVertex: vi.fn(),
    onOpenTimeSeries: vi.fn(),
    onLoadSeries: vi.fn(),
    pointToWkt: (point: { lat: number; lng: number }) => `POINT(${point.lng} ${point.lat})`,
  }
  const props: Parameters<typeof ResultInspector>[0] = {
    inspectorOpen: true,
    displayedRequest: REQUEST,
    resultMap: RESULT_MAP,
    resultDetail: RESULT_DETAIL,
    resultVisible: true,
    resultFrameIndex: 0,
    resultFrames: RESULT_MAP.frames,
    selectedFrame: RESULT_MAP.frames[0],
    selectionMode: 'none',
    selectionPoint: null,
    selectionVertices: [],
    selectionReuse: null,
    selectionSource: null,
    activeSelectionWkt: null,
    hasSelection: false,
    seriesLoading: false,
    seriesError: null,
    seriesLoaded: false,
    ...handlers,
    ...overrides,
  }
  const view = render(<ResultInspector {...props} />)
  return { ...view, props, ...handlers }
}

describe('ResultInspector', () => {
  it('toggles the inspector and renders the empty state', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const closed = renderInspector({ inspectorOpen: false })
    await user.click(screen.getByRole('button', { name: 'Show result inspector' }))
    expect(closed.setInspectorOpen).toHaveBeenCalledWith(true)
    closed.unmount()

    renderInspector({ displayedRequest: null, resultMap: null, resultDetail: null })
    expect(screen.getByText('No result representation selected.')).toBeInTheDocument()
    expect(
      screen.getByText('Select “Display on map” for a succeeded request to load a representation.'),
    ).toBeInTheDocument()
  })

  it('renders result metadata, frames and selection controls', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const inspector = renderInspector({
      selectionMode: 'point',
      selectionPoint: { lat: 43.6, lng: 1.44 },
      activeSelectionWkt: 'POINT(1.44 43.6)',
      hasSelection: true,
      selectionVertices: [{ lat: 43.6, lng: 1.44 }],
      selectionReuse: RESULT_DETAIL.geometry,
      selectionSource: 'result_geometry',
    })
    expect(screen.getByText('result-1')).toBeInTheDocument()
    expect(screen.getByText('NDVI')).toBeInTheDocument()
    expect(screen.getAllByText(/SYNTHETIC_DEMO/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Frame 1 of 2/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Displayed frame'), { target: { value: '1' } })
    expect(inspector.setResultFrameIndex).toHaveBeenCalledWith(1)
    await user.click(screen.getByRole('button', { name: 'Hide result layer' }))
    await user.click(screen.getByRole('button', { name: 'Select point' }))
    await user.click(screen.getByRole('button', { name: 'Draw polygon' }))
    await user.click(screen.getByRole('button', { name: 'Use request AOI' }))
    await user.click(screen.getByRole('button', { name: 'Use result geometry' }))
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    await user.click(screen.getByRole('button', { name: 'Undo last point' }))
    await user.click(screen.getByRole('button', { name: 'Open time series' }))
    expect(inspector.onToggleResultVisible).toHaveBeenCalled()
    expect(inspector.onStartPoint).toHaveBeenCalled()
    expect(inspector.onStartPolygon).toHaveBeenCalled()
    expect(inspector.onReuseRequestAoi).toHaveBeenCalled()
    expect(inspector.onUseResultGeometry).toHaveBeenCalled()
    expect(inspector.onClearSelection).toHaveBeenCalled()
    expect(inspector.onUndoSelectionVertex).toHaveBeenCalled()
    expect(inspector.onOpenTimeSeries).toHaveBeenCalled()
  })

  it('renders polygon, series loading, error and loaded states', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const polygon = renderInspector({
      selectionMode: 'polygon',
      selectionVertices: [
        { lat: 43.58, lng: 1.42 },
        { lat: 43.58, lng: 1.44 },
        { lat: 43.6, lng: 1.44 },
      ],
      activeSelectionWkt: 'POLYGON((1.42 43.58, 1.44 43.58, 1.44 43.6, 1.42 43.58))',
      hasSelection: true,
    })
    expect(screen.getByText(/Polygon selection: 3 vertices/)).toBeInTheDocument()
    polygon.unmount()

    const loading = renderInspector({ seriesLoading: true })
    expect(screen.getByText('Loading temporal series…')).toBeInTheDocument()
    loading.unmount()

    const error = renderInspector({ seriesError: 'Series unavailable' })
    expect(screen.getByText('Series unavailable')).toBeInTheDocument()
    error.unmount()

    const loaded = renderInspector({ seriesLoaded: true })
    await user.click(screen.getByRole('button', { name: 'Reload series' }))
    expect(loaded.onLoadSeries).toHaveBeenCalled()
  })
})
