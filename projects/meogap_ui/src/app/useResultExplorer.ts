import { useState } from 'react'
import {
  createDelivery,
  getDelivery,
  getResult,
  getResultMap,
  queryResultSeries,
  type AnalysisRequest,
  type ApiResponse,
  type AoiGeometry,
  type Delivery,
  type DeliveryKind,
  type Position,
  type ResultDetail,
  type ResultMap,
  type SeriesResponse,
} from '../api/client'
import type { SelectionMode } from '../map/LeafletMapSurface'
import {
  geometryAreaKm2,
  geometryToVertices,
  geometryToWkt,
  pointInBounds,
  pointInGeometry,
  positionToWktPoint,
  verticesToPolygon,
  verticesToWktPolygon,
  verticesWithinBounds,
  type MapBounds,
} from '../map/coordinates'
import {
  EMPTY_TEMPORAL_FILTERS,
  filterSeriesPoints,
  hemisphereForLatitudes,
  type TemporalFilters,
} from '../temporal'
import { MAX_SELECTION_AREA_KM2, SELECTION_CRS, errorMessage } from './constants'

type FocusBounds = (
  bounds: MapBounds,
  options?: { reserveRightPanel?: boolean; reserveInspector?: boolean },
) => void

type ResultExplorerOptions = {
  receive: <T>(response: ApiResponse<T>) => T
  showError: (action: string, reason: unknown) => void
  setError: (message: string | null) => void
  focusBounds: FocusBounds
}

type SelectionSource = 'request_aoi' | 'result_geometry' | null

export function useResultExplorer({
  receive,
  showError,
  setError,
  focusBounds,
}: ResultExplorerOptions) {
  const [resultMap, setResultMap] = useState<ResultMap | null>(null)
  const [resultFrameIndex, setResultFrameIndex] = useState(0)
  const [resultDetail, setResultDetail] = useState<ResultDetail | null>(null)
  const [displayedRequest, setDisplayedRequest] = useState<AnalysisRequest | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({})
  const [resultVisible, setResultVisible] = useState(true)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none')
  const [selectionPoint, setSelectionPoint] = useState<Position | null>(null)
  const [selectionVertices, setSelectionVertices] = useState<Position[]>([])
  const [selectionReuse, setSelectionReuse] = useState<AoiGeometry | null>(null)
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null)
  const [chartOpen, setChartOpen] = useState(false)
  const [series, setSeries] = useState<SeriesResponse | null>(null)
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const [temporalFilters, setTemporalFilters] = useState<TemporalFilters>(EMPTY_TEMPORAL_FILTERS)
  const [selectedParameters, setSelectedParameters] = useState<string[]>([])

  function resetSelection(): void {
    setSelectionMode('none')
    setSelectionPoint(null)
    setSelectionVertices([])
    setSelectionReuse(null)
    setSelectionSource(null)
    setSeries(null)
    setSeriesError(null)
    setSelectedParameters([])
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
  }

  function clearSelection(): void {
    resetSelection()
  }

  function startPointSelection(): void {
    setSelectionMode('point')
    setSelectionVertices([])
    setSelectionReuse(null)
    setSelectionSource(null)
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
  }

  function startPolygonSelection(): void {
    setSelectionMode('polygon')
    setSelectionPoint(null)
    setSelectionVertices([])
    setSelectionReuse(null)
    setSelectionSource(null)
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
  }

  function reuseRequestAoi(): void {
    if (!displayedRequest?.geometrySnapshot) {
      setError('The displayed request does not expose a reusable AOI geometry.')
      return
    }
    if (displayedRequest.geometrySnapshot.type !== 'Polygon') {
      setError('The request AOI is a MultiPolygon. Draw a polygon selection instead of reusing it.')
      return
    }
    setSelectionMode('none')
    setSelectionPoint(null)
    setSelectionReuse(displayedRequest.geometrySnapshot)
    setSelectionSource('request_aoi')
    setSelectionVertices(geometryToVertices(displayedRequest.geometrySnapshot))
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
  }

  function useResultGeometry(): void {
    if (!resultDetail?.geometry) {
      setError('The displayed result does not expose a selectable result geometry.')
      return
    }
    if (resultDetail.geometry.type !== 'Polygon') {
      setError(
        'The complete result geometry is a MultiPolygon. Draw a polygon selection instead of reusing it.',
      )
      return
    }
    setSelectionMode('none')
    setSelectionPoint(null)
    setSelectionReuse(resultDetail.geometry)
    setSelectionSource('result_geometry')
    setSelectionVertices(geometryToVertices(resultDetail.geometry))
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
  }

  function undoSelectionVertex(): void {
    setSelectionVertices((vertices) => vertices.slice(0, -1))
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
  }

  function handleResultClick(position: Position): void {
    if (!resultMap?.bounds) return
    const [first, second] = resultMap.bounds
    const resultBounds: MapBounds = {
      south: Math.min(first.lat, second.lat),
      west: Math.min(first.lng, second.lng),
      north: Math.max(first.lat, second.lat),
      east: Math.max(first.lng, second.lng),
    }
    if (!pointInBounds(position, resultBounds)) {
      setError('The selected position is outside the displayed result.')
      return
    }
    if (resultDetail && !pointInGeometry(position, resultDetail.geometry)) {
      setError('The selected position is outside the displayed result geometry.')
      return
    }
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
    if (selectionMode === 'point') {
      setSelectionPoint(position)
      setSelectionVertices([])
      setSelectionReuse(null)
      setSelectionSource(null)
      setSelectionMode('none')
      return
    }
    if (selectionMode === 'polygon') {
      if (!verticesWithinBounds([...selectionVertices, position], resultBounds)) {
        setError('The selected polygon must stay inside the displayed result.')
        return
      }
      setSelectionPoint(null)
      setSelectionReuse(null)
      setSelectionSource(null)
      setSelectionVertices((vertices) => [...vertices, position])
    }
  }

  async function displayResult(request: AnalysisRequest): Promise<void> {
    if (!request.resultId) return
    try {
      const [representation, detail] = await Promise.all([
        getResultMap(request.resultId),
        getResult(request.resultId),
      ])
      const resultMapResponse = receive(representation)
      setResultMap(resultMapResponse)
      setResultFrameIndex(0)
      setResultDetail(receive(detail))
      if (resultMapResponse.bounds) {
        const [first, second] = resultMapResponse.bounds
        focusBounds(
          {
            south: Math.min(first.lat, second.lat),
            west: Math.min(first.lng, second.lng),
            north: Math.max(first.lat, second.lat),
            east: Math.max(first.lng, second.lng),
          },
          { reserveRightPanel: true, reserveInspector: true },
        )
      }
      setDisplayedRequest(request)
      setResultVisible(true)
      resetSelection()
    } catch (reason) {
      showError('Map representation could not be loaded', reason)
    }
  }

  async function requestDelivery(request: AnalysisRequest, kind: DeliveryKind): Promise<void> {
    if (!request.resultId) return
    try {
      const nextDelivery = receive(await createDelivery(request.resultId, kind))
      setDeliveries((current) => ({ ...current, [request.id]: nextDelivery }))
    } catch (reason) {
      showError('Delivery could not be prepared', reason)
    }
  }

  async function refreshDelivery(requestId: string, deliveryId: string): Promise<void> {
    try {
      const nextDelivery = receive(await getDelivery(deliveryId))
      setDeliveries((current) => ({ ...current, [requestId]: nextDelivery }))
    } catch (reason) {
      showError('Delivery status could not be refreshed', reason)
    }
  }

  async function loadSeries(openAfterLoad = false): Promise<boolean> {
    if (!displayedRequest?.resultId || !displayedRequest.startMonth || !displayedRequest.endMonth) {
      setSeriesError('The displayed result does not declare a supported period.')
      return false
    }
    let geometryWkt: string | null = null
    let selectionGeometry: AoiGeometry | null = null
    if (selectionPoint) {
      geometryWkt = positionToWktPoint(selectionPoint)
    } else if (selectionReuse) {
      if (selectionReuse.type !== 'Polygon') {
        setSeriesError(
          'The selected MultiPolygon cannot be sent as a single M0 WKT selection. Draw a polygon instead.',
        )
        return false
      }
      geometryWkt = geometryToWkt(selectionReuse)
      selectionGeometry = selectionReuse
    } else if (selectionVertices.length >= 3) {
      geometryWkt = verticesToWktPolygon(selectionVertices)
      selectionGeometry = verticesToPolygon(selectionVertices)
    }
    if (!geometryWkt) {
      setSeriesError('Select a point or draw a polygon with at least three vertices.')
      return false
    }
    if (resultMap?.bounds) {
      const [first, second] = resultMap.bounds
      const resultBounds: MapBounds = {
        south: Math.min(first.lat, second.lat),
        west: Math.min(first.lng, second.lng),
        north: Math.max(first.lat, second.lat),
        east: Math.max(first.lng, second.lng),
      }
      if (selectionPoint && !pointInBounds(selectionPoint, resultBounds)) {
        setSeriesError('The selected point is outside the displayed result.')
        return false
      }
      if (selectionVertices.length > 0 && !verticesWithinBounds(selectionVertices, resultBounds)) {
        setSeriesError('The selected polygon is outside the displayed result.')
        return false
      }
    }
    if (selectionGeometry && geometryAreaKm2(selectionGeometry) > MAX_SELECTION_AREA_KM2) {
      setSeriesError(`The selected polygon exceeds ${MAX_SELECTION_AREA_KM2} km².`)
      return false
    }
    setSeriesLoading(true)
    setSeriesError(null)
    try {
      const response = receive(
        await queryResultSeries(displayedRequest.resultId, {
          geometryWkt,
          crs: SELECTION_CRS,
          startMonth: displayedRequest.startMonth,
          endMonth: displayedRequest.endMonth,
        }),
      )
      setSeries(response)
      setSelectedParameters(response.selectedParameters)
      setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
      if (openAfterLoad) setChartOpen(true)
      return true
    } catch (reason) {
      setSeries(null)
      setSeriesError(errorMessage(reason))
      return false
    } finally {
      setSeriesLoading(false)
    }
  }

  async function openTimeSeries(): Promise<void> {
    if (series) {
      setChartOpen(true)
      return
    }
    await loadSeries(true)
  }

  function toggleParameter(name: string): void {
    setSelectedParameters((current) => {
      if (current.includes(name)) {
        return current.length === 1 ? current : current.filter((item) => item !== name)
      }
      return [...current, name]
    })
  }

  function reset(): void {
    resetSelection()
    setResultMap(null)
    setResultDetail(null)
    setDisplayedRequest(null)
    setDeliveries({})
    setResultVisible(true)
    setResultFrameIndex(0)
  }

  const resultFrames = resultMap?.frames ?? []
  const selectedResultFrame = resultFrames[resultFrameIndex] ?? null
  const resultPeriodLabel =
    displayedRequest?.startMonth && displayedRequest?.endMonth
      ? `${displayedRequest.startMonth} to ${displayedRequest.endMonth} UTC`
      : 'Period unavailable'
  const selectionLatitudes = (): number[] => {
    if (selectionPoint) return [selectionPoint.lat]
    if (selectionReuse) return geometryToVertices(selectionReuse).map((position) => position.lat)
    return selectionVertices.map((position) => position.lat)
  }
  const seriesHemisphere = hemisphereForLatitudes(selectionLatitudes())
  const availableParameters = series?.availableParameters ?? []
  const parameterPoints = series
    ? series.points.filter((point) => selectedParameters.includes(point.parameter))
    : []
  const filteredSeriesPoints = series
    ? filterSeriesPoints(parameterPoints, temporalFilters, seriesHemisphere)
    : []
  const hasSelection = Boolean(selectionPoint || selectionReuse || selectionVertices.length >= 3)
  const activeSelectionWkt = selectionPoint
    ? positionToWktPoint(selectionPoint)
    : selectionReuse
      ? geometryToWkt(selectionReuse)
      : verticesToWktPolygon(selectionVertices)
  const selectionLabel = selectionPoint
    ? `Point selection · ${activeSelectionWkt} · ${SELECTION_CRS}`
    : selectionReuse
      ? `${selectionSource === 'result_geometry' ? 'Entire result geometry' : 'Request AOI'} · ${SELECTION_CRS}`
      : selectionVertices.length >= 3
        ? `Drawn polygon · ${selectionVertices.length} vertices · ${SELECTION_CRS}`
        : 'No spatial selection'
  const resultProductName = resultDetail?.productName ?? displayedRequest?.productId ?? 'Result'

  return {
    resultMap,
    resultFrameIndex,
    setResultFrameIndex,
    resultDetail,
    displayedRequest,
    deliveries,
    resultVisible,
    setResultVisible,
    selectionMode,
    selectionPoint,
    selectionVertices,
    setSelectionVertices,
    selectionReuse,
    selectionSource,
    chartOpen,
    setChartOpen,
    series,
    seriesLoading,
    seriesError,
    temporalFilters,
    setTemporalFilters,
    selectedParameters,
    toggleParameter,
    availableParameters,
    filteredSeriesPoints,
    hasSelection,
    activeSelectionWkt,
    selectionLabel,
    resultProductName,
    resultFrames,
    selectedResultFrame,
    resultPeriodLabel,
    seriesHemisphere,
    displayResult,
    clearSelection,
    startPointSelection,
    startPolygonSelection,
    reuseRequestAoi,
    useResultGeometry,
    handleResultClick,
    undoSelectionVertex,
    loadSeries,
    openTimeSeries,
    requestDelivery,
    refreshDelivery,
    reset,
    resetFilters: () => setTemporalFilters(EMPTY_TEMPORAL_FILTERS),
  }
}
