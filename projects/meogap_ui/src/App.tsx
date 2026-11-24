import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import {
  cancelAnalysisRequest,
  confirmAnalysisRequest,
  createAnalysisRequest,
  createAoi,
  createDelivery,
  deleteAoi,
  estimateAnalysisRequest,
  getAccount,
  getAnalysisRequest,
  getAoi,
  getCreditBalance,
  getDelivery,
  getProduct,
  getProductMissions,
  getProductRequirements,
  getResult,
  getResultMap,
  listAnalysisRequests,
  listAois,
  listProducts,
  queryResultSeries,
  updateAoi,
  type Account,
  type AnalysisRequest,
  type AnalysisState,
  type ApiResponse,
  type Aoi,
  type AoiGeometry,
  type CostEstimate,
  type CreditBalance,
  type Delivery,
  type DeliveryKind,
  type Position,
  type Product,
  type ProductRequirements,
  type ResultDetail,
  type ResultMap,
  type SeriesResponse,
  type SourceMissionInfo,
  type TemporalFrequency,
} from './api/client'
import { ChartWorkspace } from './components/ChartWorkspace'
import { Icon, type IconName } from './components/Icon'
import { Logo } from './components/Logo'
import { OverlayPanel } from './components/OverlayPanel'
import { ProductCard, ProductPreview } from './components/ProductCard'
import {
  LeafletMapSurface,
  type MapSurfaceComponent,
  type SelectionMode,
} from './map/LeafletMapSurface'
import {
  formatAreaKm2,
  geometryAreaKm2,
  geometryBounds,
  geometryToVertices,
  geometryToWkt,
  parseCoordinates,
  pointInBounds,
  pointInGeometry,
  positionToWktPoint,
  verticesToPolygon,
  verticesToWktPolygon,
  verticesAreaKm2,
  verticesWithinBounds,
  type MapBounds,
  type MapFocus,
} from './map/coordinates'
import { searchPlaces } from './map/places'
import { AOI_AREA_LIMIT_MESSAGE, AOI_MAX_AREA_KM2 } from './config'
import {
  EMPTY_TEMPORAL_FILTERS,
  filterSeriesPoints,
  hemisphereForLatitudes,
  type TemporalFilters,
} from './temporal'

type Panel = 'catalogue' | 'aois' | 'requests' | 'indicators' | 'account' | 'request' | null

type AppProps = {
  MapSurface?: MapSurfaceComponent
  pollIntervalMs?: number
}

type LoadingState = {
  catalogue: boolean
  aois: boolean
  requests: boolean
  balance: boolean
}

type LoadErrors = {
  catalogue: boolean
  aois: boolean
  requests: boolean
}

const INITIAL_AOI_NAME = ''
const EMPTY_DESCRIPTION = ''
const EMPTY_MONTH = ''
const DEFAULT_POLL_INTERVAL_MS = 5000
const PANEL_RESERVE_PX = 480
const MAP_TOOL_RESERVE_PX = 112
const TOP_RESERVE_PX = 96
const INSPECTOR_COLLAPSED_RESERVE_PX = 140
const INSPECTOR_EXPANDED_RESERVE_PX = 210
const NARROW_LAYOUT_MAX_WIDTH_PX = 1000
const TERMINAL_STATES: ReadonlySet<AnalysisState> = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])
const SELECTION_CRS = 'EPSG:4326'
const MAX_SELECTION_AREA_KM2 = 25_000
const TEMPORAL_FREQUENCY_LABELS: Record<TemporalFrequency, string> = {
  monthly: 'Monthly',
  semimonthly: 'Semi-monthly',
  weekly: 'Weekly',
  three_day: '3-day',
  two_day: '2-day',
  daily: '1-day',
}

function temporalFrequencyLabel(frequency: TemporalFrequency | null): string {
  return frequency ? TEMPORAL_FREQUENCY_LABELS[frequency] : 'Not specified'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

function replaceById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const index = items.findIndex((item) => item.id === nextItem.id)
  if (index === -1) return [nextItem, ...items]
  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}

function StatusPill({ state }: { state: string }) {
  return (
    <span className={`status-pill status-${state.toLowerCase()}`}>
      {state.replaceAll('_', ' ')}
    </span>
  )
}

function NavButton({
  active,
  icon,
  label,
  onClick,
  badge,
}: {
  active: boolean
  icon: IconName
  label: string
  onClick: () => void
  badge?: number
}) {
  const accessibleLabel = badge ? `${label}, ${badge} active` : label
  return (
    <button
      type="button"
      className={active ? 'nav-active' : ''}
      onClick={onClick}
      aria-pressed={active}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <Icon name={icon} />
      <span className="nav-label">{label}</span>
      {badge ? (
        <span className="nav-badge" aria-hidden="true">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )
}

type SearchSuggestion = {
  id: string
  kind: 'coordinate' | 'aoi' | 'place'
  label: string
  detail: string
  icon: IconName
  focus?: MapFocus
  aoiId?: string
}

function buildSearchSuggestions(query: string, aois: Aoi[], limit = 8): SearchSuggestion[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const suggestions: SearchSuggestion[] = []
  const coordinates = parseCoordinates(trimmed)
  if (coordinates && coordinates.type === 'point') {
    suggestions.push({
      id: 'coordinate',
      kind: 'coordinate',
      label: `${coordinates.lat}, ${coordinates.lng}`,
      detail: 'Geographic coordinates',
      icon: 'map-pin',
      focus: coordinates,
    })
  }
  const normalized = trimmed.toLowerCase()
  const matchingAois = aois
    .filter((aoi) => aoi.name.toLowerCase().includes(normalized))
    .slice(0, 4)
    .map<SearchSuggestion>((aoi) => ({
      id: `aoi-${aoi.id}`,
      kind: 'aoi',
      label: aoi.name,
      detail: `Saved AOI · Revision ${aoi.revision}`,
      icon: 'layers',
      aoiId: aoi.id,
    }))
  const matchingPlaces = searchPlaces(trimmed, 5).map<SearchSuggestion>((place) => ({
    id: `place-${place.id}`,
    kind: 'place',
    label: place.name,
    detail: `${place.region} · Place`,
    icon: 'compass',
    focus: { type: 'point', lat: place.lat, lng: place.lng, zoom: 10 },
  }))
  return [...suggestions, ...matchingAois, ...matchingPlaces].slice(0, limit)
}

function RequestCard({
  request,
  productName,
  aoiName,
  onRefresh,
  onConfirm,
  onCancel,
  onDisplay,
  onDelivery,
  delivery,
  onRefreshDelivery,
}: {
  request: AnalysisRequest
  productName: string | null
  aoiName: string | null
  onRefresh: (id: string) => void
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  onDisplay: (request: AnalysisRequest) => void
  onDelivery: (request: AnalysisRequest, kind: DeliveryKind) => void
  delivery: Delivery | null
  onRefreshDelivery: (requestId: string, deliveryId: string) => void
}) {
  const canCancel = !['COMPLETED', 'FAILED', 'CANCELLED'].includes(request.state)
  const hasResult = request.resultId !== null
  const sources = request.requestedSources.length
    ? request.requestedSources.join(', ')
    : 'No source restriction'

  return (
    <article className="request-card">
      <div className="request-card-heading">
        <div>
          <strong>{productName ?? request.productId ?? 'Analysis request'}</strong>
          <span className="request-id">Request {request.id}</span>
        </div>
        <StatusPill state={request.state} />
      </div>
      <dl className="request-facts">
        <div>
          <dt>AOI</dt>
          <dd>{aoiName ?? request.aoiId ?? 'Not available'}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>
            {request.startMonth && request.endMonth
              ? `${request.startMonth} to ${request.endMonth} UTC`
              : 'Not available'}
          </dd>
        </div>
        <div>
          <dt>Sources</dt>
          <dd>{sources}</dd>
        </div>
        <div>
          <dt>Temporal frequency</dt>
          <dd>{temporalFrequencyLabel(request.temporalFrequency)}</dd>
        </div>
        <div>
          <dt>Max pixel size</dt>
          <dd>
            {request.requestedSpatialResolutionM != null
              ? `${request.requestedSpatialResolutionM} m`
              : 'Not restricted'}
          </dd>
        </div>
        {request.estimatedCredits !== null ? (
          <div>
            <dt>Estimated</dt>
            <dd>{request.estimatedCredits} credits</dd>
          </div>
        ) : null}
        {request.actualCredits !== null ? (
          <div>
            <dt>Actual</dt>
            <dd>{request.actualCredits} credits</dd>
          </div>
        ) : null}
      </dl>
      {request.message ? <p className="notice-text">{request.message}</p> : null}
      {request.state === 'FAILED' ? (
        <p className="failure-text">
          Failed{request.failureStage ? ` during ${request.failureStage.toLowerCase()}` : ''}.
        </p>
      ) : null}
      {request.state === 'PREPARING' ? <p>Preparing a proposal.</p> : null}
      {request.state === 'PROPOSED' ? (
        <p>Review the estimate, then explicitly confirm execution.</p>
      ) : null}
      {request.state === 'IN_EXECUTION' ? (
        <p>Execution is in progress. Result availability is not yet guaranteed.</p>
      ) : null}
      {request.state === 'COMPLETED' && !hasResult ? (
        <p>Completed, but no result identifier was provided for map or delivery access.</p>
      ) : null}
      {delivery ? (
        <div className="request-delivery" aria-label={`Delivery for request ${request.id}`}>
          <div className="request-delivery-heading">
            <strong>
              Delivery {delivery.kind ? `(${delivery.kind.replaceAll('_', ' ')})` : ''}
            </strong>
            <StatusPill state={delivery.state} />
          </div>
          {delivery.message ? <p>{delivery.message}</p> : null}
          {delivery.state === 'FAILED' ? (
            <p className="failure-text">The delivery could not be prepared.</p>
          ) : null}
          {delivery.state === 'READY' && !delivery.downloadUrl ? (
            <p className="failure-text">The delivery is ready but no download URL was provided.</p>
          ) : null}
          {delivery.state === 'READY' && delivery.downloadUrl ? (
            <a
              className="button button-primary"
              href={delivery.downloadUrl}
              download={
                delivery.kind === 'dependency_archive'
                  ? 'meogap-archive.geojson'
                  : 'meogap-product.geojson'
              }
            >
              <Icon name="download" />
              Download {delivery.kind === 'dependency_archive' ? 'archive' : 'product'}
            </a>
          ) : null}
          {delivery.state !== 'READY' ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onRefreshDelivery(request.id, delivery.id)}
            >
              <Icon name="refresh" />
              Refresh delivery
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="card-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onRefresh(request.id)}
          title="Refresh this request from the server"
        >
          <Icon name="refresh" />
          Refresh
        </button>
        {request.state === 'PROPOSED' ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => onConfirm(request.id)}
          >
            <Icon name="check" />
            Confirm execution
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className="button button-danger"
            onClick={() => onCancel(request.id)}
          >
            <Icon name="close" />
            Cancel request
          </button>
        ) : null}
        {request.state === 'COMPLETED' ? (
          <button
            type="button"
            className="button button-primary"
            disabled={!hasResult}
            onClick={() => onDisplay(request)}
          >
            Display on map
          </button>
        ) : null}
        {request.state === 'COMPLETED' ? (
          <>
            <button
              type="button"
              className="button button-secondary"
              disabled={!hasResult}
              onClick={() => onDelivery(request, 'final_product')}
            >
              <Icon name="download" />
              Final product
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={!hasResult}
              onClick={() => onDelivery(request, 'dependency_archive')}
            >
              <Icon name="download" />
              Full archive
            </button>
          </>
        ) : null}
      </div>
    </article>
  )
}

function StateNotice({
  icon,
  children,
  tone = 'muted',
}: {
  icon: IconName
  children: ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <div
      className={`state-notice state-notice-${tone}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

export default function App({
  MapSurface = LeafletMapSurface,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: AppProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [aois, setAois] = useState<Aoi[]>([])
  const [requests, setRequests] = useState<AnalysisRequest[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [requirements, setRequirements] = useState<ProductRequirements | null>(null)
  const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null)
  const [aoiQuery, setAoiQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [focusRevision, setFocusRevision] = useState(0)
  const [draftVertices, setDraftVertices] = useState<Position[]>([])
  const [drawing, setDrawing] = useState(false)
  const [editingAoiId, setEditingAoiId] = useState<string | null>(null)
  const [resumeRequestAfterAoi, setResumeRequestAfterAoi] = useState(false)
  const [aoiName, setAoiName] = useState(INITIAL_AOI_NAME)
  const [aoiDescription, setAoiDescription] = useState(EMPTY_DESCRIPTION)
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
  const drawingFormRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLFormElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const [requestProductId, setRequestProductId] = useState('')
  const [requestAoiId, setRequestAoiId] = useState('')
  const [requestSources, setRequestSources] = useState<string[]>([])
  const [requestResolution, setRequestResolution] = useState('')
  const [requestFrequency, setRequestFrequency] = useState<TemporalFrequency | ''>('')
  const [startMonth, setStartMonth] = useState(EMPTY_MONTH)
  const [endMonth, setEndMonth] = useState(EMPTY_MONTH)
  const [resultMap, setResultMap] = useState<ResultMap | null>(null)
  const [resultDetail, setResultDetail] = useState<ResultDetail | null>(null)
  const [displayedRequest, setDisplayedRequest] = useState<AnalysisRequest | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({})
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [sessionActive, setSessionActive] = useState(true)
  const [missions, setMissions] = useState<SourceMissionInfo[]>([])
  const [missionsProductId, setMissionsProductId] = useState<string | null>(null)
  const [missionsLoading, setMissionsLoading] = useState(false)
  const [missionsError, setMissionsError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<CostEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [resultVisible, setResultVisible] = useState(true)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none')
  const [selectionPoint, setSelectionPoint] = useState<Position | null>(null)
  const [selectionVertices, setSelectionVertices] = useState<Position[]>([])
  const [selectionReuse, setSelectionReuse] = useState<AoiGeometry | null>(null)
  const [selectionSource, setSelectionSource] = useState<'request_aoi' | 'result_geometry' | null>(
    null,
  )
  const [chartOpen, setChartOpen] = useState(false)
  const [series, setSeries] = useState<SeriesResponse | null>(null)
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const [temporalFilters, setTemporalFilters] = useState<TemporalFilters>(EMPTY_TEMPORAL_FILTERS)
  const [isLoading, setIsLoading] = useState<LoadingState>({
    catalogue: true,
    aois: true,
    requests: true,
    balance: false,
  })
  const [loadErrors, setLoadErrors] = useState<LoadErrors>({
    catalogue: false,
    aois: false,
    requests: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const receive = useCallback(function receiveResponse<T>(response: ApiResponse<T>): T {
    if (response.isDemo) setIsDemo(true)
    return response.data
  }, [])

  const showError = useCallback((action: string, reason: unknown): void => {
    setError(`${action}: ${errorMessage(reason)}`)
  }, [])

  const loadCatalogue = useCallback(async (): Promise<void> => {
    try {
      setProducts(receive(await listProducts()))
      setLoadErrors((current) => ({ ...current, catalogue: false }))
    } catch (reason) {
      setLoadErrors((current) => ({ ...current, catalogue: true }))
      showError('Catalogue could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, catalogue: false }))
    }
  }, [receive, showError])

  const loadAois = useCallback(async (): Promise<void> => {
    try {
      setAois(receive(await listAois()))
      setLoadErrors((current) => ({ ...current, aois: false }))
    } catch (reason) {
      setLoadErrors((current) => ({ ...current, aois: true }))
      showError('AOI library could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, aois: false }))
    }
  }, [receive, showError])

  const loadRequests = useCallback(async (): Promise<void> => {
    try {
      setRequests(receive(await listAnalysisRequests()))
      setLoadErrors((current) => ({ ...current, requests: false }))
    } catch (reason) {
      setLoadErrors((current) => ({ ...current, requests: true }))
      showError('Requests could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, requests: false }))
    }
  }, [receive, showError])

  const refreshBalance = useCallback(async (): Promise<void> => {
    setIsLoading((current) => ({ ...current, balance: true }))
    try {
      setCreditBalance(receive(await getCreditBalance()))
    } catch (reason) {
      showError('Credit balance could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, balance: false }))
    }
  }, [receive, showError])

  const loadAccount = useCallback(async (): Promise<void> => {
    try {
      setAccount(receive(await getAccount()))
    } catch (reason) {
      showError('Account identity could not be loaded', reason)
    }
  }, [receive, showError])

  useEffect(() => {
    if (!sessionActive) return
    const timer = window.setTimeout(() => {
      void loadCatalogue()
      void loadAois()
      void loadRequests()
      void refreshBalance()
      void loadAccount()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [sessionActive, loadCatalogue, loadAois, loadRequests, refreshBalance, loadAccount])

  const hasActiveRequests = requests.some((request) => !TERMINAL_STATES.has(request.state))
  const activeRequestCount = requests.filter(
    (request) => !TERMINAL_STATES.has(request.state),
  ).length

  useEffect(() => {
    if (!sessionActive || !hasActiveRequests) return
    let active = true
    const timer = window.setInterval(() => {
      void listAnalysisRequests()
        .then((response) => {
          if (active) setRequests(receive(response))
        })
        .catch((reason: unknown) => {
          if (active) showError('Request status could not be refreshed', reason)
        })
    }, pollIntervalMs)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [sessionActive, hasActiveRequests, pollIntervalMs, receive, showError])

  useEffect(() => {
    if (!sessionActive || panel !== 'request') return
    if (!requestProductId || !requestAoiId || !startMonth || !endMonth || startMonth > endMonth) {
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return
      setEstimating(true)
      setEstimateError(null)
      const allMissionsSelected =
        missions.length > 0 &&
        requestSources.length === missions.map((mission) => mission.id).length
      void estimateAnalysisRequest({
        productId: requestProductId,
        aoiId: requestAoiId,
        startMonth,
        endMonth,
        spatialResolutionM: requestResolution ? Number(requestResolution) : null,
        sources: allMissionsSelected ? [] : requestSources,
        temporalFrequency: requestFrequency || null,
      })
        .then((response) => {
          if (active) setEstimate(receive(response))
        })
        .catch((reason: unknown) => {
          if (active) {
            setEstimate(null)
            setEstimateError(errorMessage(reason))
          }
        })
        .finally(() => {
          if (active) setEstimating(false)
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [
    sessionActive,
    panel,
    requestProductId,
    requestAoiId,
    startMonth,
    endMonth,
    requestResolution,
    requestSources,
    requestFrequency,
    missions,
    receive,
  ])

  useEffect(() => {
    if (panel !== 'aois' || !drawing) return
    const node = drawingFormRef.current
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [panel, drawing])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        setAccountOpen(false)
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    if (!searchOpen && !accountOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (
        searchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setSearchOpen(false)
      }
      if (accountOpen && accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setSearchOpen(false)
      if (accountOpen) {
        setAccountOpen(false)
        accountButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [searchOpen, accountOpen])

  function applyFocus(nextFocus: MapFocus | null): void {
    setFocus(nextFocus)
    setFocusRevision((revision) => revision + 1)
  }

  function focusBounds(
    bounds: MapBounds,
    options: { reserveRightPanel?: boolean; reserveInspector?: boolean } = {},
  ): void {
    const wide = typeof window === 'undefined' || window.innerWidth > NARROW_LAYOUT_MAX_WIDTH_PX
    const reserveRightPanel = wide && (options.reserveRightPanel ?? panel !== null)
    const reserveInspector = options.reserveInspector ?? inspectorOpen
    applyFocus({
      type: 'bounds',
      bounds,
      maxZoom: 13,
      paddingTopLeft: [MAP_TOOL_RESERVE_PX, TOP_RESERVE_PX],
      paddingBottomRight: [
        reserveRightPanel ? PANEL_RESERVE_PX : MAP_TOOL_RESERVE_PX,
        reserveInspector ? INSPECTOR_EXPANDED_RESERVE_PX : INSPECTOR_COLLAPSED_RESERVE_PX,
      ],
    })
  }

  async function loadMissions(
    productId: string,
    options: { selectAll?: boolean } = {},
  ): Promise<void> {
    setMissionsLoading(true)
    setMissionsError(null)
    try {
      const response = receive(await getProductMissions(productId))
      setMissions(response.items)
      setMissionsProductId(response.productId)
      if (options.selectAll) setRequestSources(response.items.map((mission) => mission.id))
    } catch (reason) {
      setMissions([])
      setMissionsProductId(productId)
      setMissionsError(errorMessage(reason))
    } finally {
      setMissionsLoading(false)
    }
  }

  async function selectProduct(id: string): Promise<void> {
    setSelectedProductId(id)
    setSelectedProduct(null)
    setRequirements(null)
    setMissions([])
    setMissionsProductId(null)
    try {
      const [productResult, requirementsResult] = await Promise.all([
        getProduct(id),
        getProductRequirements(id),
      ])
      setSelectedProduct(receive(productResult))
      setRequirements(receive(requirementsResult))
      await loadMissions(id)
    } catch (reason) {
      showError('Product details could not be loaded', reason)
    }
  }

  async function selectAoi(
    id: string,
    options: { reserveRightPanel?: boolean } = {},
  ): Promise<void> {
    setSelectedAoiId(id)
    try {
      const response = await getAoi(id)
      const aoi = receive(response)
      setAois((current) => replaceById(current, aoi))
      const bounds = geometryBounds(aoi.geometry)
      if (bounds) focusBounds(bounds, { reserveRightPanel: options.reserveRightPanel })
    } catch (reason) {
      showError('AOI details could not be loaded', reason)
    }
  }

  function beginNewAoi(resumeRequest = false): void {
    setEditingAoiId(null)
    setAoiName(INITIAL_AOI_NAME)
    setAoiDescription(EMPTY_DESCRIPTION)
    setDraftVertices([])
    setDrawing(true)
    setDeleteCandidateId(null)
    setResumeRequestAfterAoi(resumeRequest)
    setPanel('aois')
  }

  function beginEditAoi(aoi: Aoi): void {
    setEditingAoiId(aoi.id)
    setAoiName(aoi.name)
    setAoiDescription(aoi.description ?? EMPTY_DESCRIPTION)
    setDraftVertices(geometryToVertices(aoi.geometry))
    setDrawing(true)
    setDeleteCandidateId(null)
  }

  function discardDraft(): void {
    setEditingAoiId(null)
    setAoiName(INITIAL_AOI_NAME)
    setAoiDescription(EMPTY_DESCRIPTION)
    setDraftVertices([])
    setDrawing(false)
    setResumeRequestAfterAoi(false)
  }

  function resetDraftBoundary(): void {
    setDraftVertices([])
  }

  async function saveAoi(): Promise<void> {
    const name = aoiName.trim()
    const geometry = verticesToPolygon(draftVertices)
    if (!name || !geometry) {
      setError('An AOI needs a name and at least three boundary points before it can be saved.')
      return
    }
    const areaKm2 = geometryAreaKm2(geometry)
    if (areaKm2 > AOI_MAX_AREA_KM2) {
      setError(`${AOI_AREA_LIMIT_MESSAGE} Current area: ${formatAreaKm2(areaKm2)}.`)
      return
    }
    try {
      const input = { name, description: aoiDescription.trim() || null, geometry }
      const response = editingAoiId ? await updateAoi(editingAoiId, input) : await createAoi(input)
      const aoi = receive(response)
      const resumeRequest = resumeRequestAfterAoi
      setAois((current) => replaceById(current, aoi))
      setSelectedAoiId(aoi.id)
      discardDraft()
      const bounds = geometryBounds(aoi.geometry)
      if (bounds) focusBounds(bounds)
      if (resumeRequest) {
        setRequestAoiId(aoi.id)
        setPanel('request')
      }
    } catch (reason) {
      showError('AOI could not be saved', reason)
    }
  }

  async function removeAoi(id: string): Promise<void> {
    try {
      receive(await deleteAoi(id))
      setAois((current) => current.filter((aoi) => aoi.id !== id))
      if (selectedAoiId === id) setSelectedAoiId(null)
      if (editingAoiId === id) discardDraft()
      setDeleteCandidateId(null)
    } catch (reason) {
      showError('AOI could not be deleted', reason)
    }
  }

  function openRequest(productId = selectedProductId ?? ''): void {
    setRequestProductId(productId)
    setRequestAoiId(selectedAoiId ?? '')
    setRequestSources([])
    setRequestResolution('')
    setEstimate(null)
    setEstimateError(null)
    if (productId && missionsProductId !== productId)
      void loadMissions(productId, { selectAll: true })
    if (productId && missionsProductId === productId) {
      setRequestSources(missions.map((mission) => mission.id))
    }
    setPanel('request')
  }

  function changeRequestProduct(productId: string): void {
    setRequestProductId(productId)
    setRequestSources([])
    setRequestResolution('')
    setRequestFrequency('')
    setEstimate(null)
    setEstimateError(null)
    setMissions([])
    setMissionsProductId(null)
    if (productId) void loadMissions(productId, { selectAll: true })
  }

  function toggleRequestSource(source: string): void {
    setRequestSources((current) =>
      current.includes(source) ? current.filter((item) => item !== source) : [...current, source],
    )
    setEstimate(null)
  }

  function selectAllRequestSources(): void {
    setRequestSources(missions.map((mission) => mission.id))
    setEstimate(null)
  }

  async function submitRequest(): Promise<void> {
    if (!requestProductId || !requestAoiId || !startMonth || !endMonth) {
      setError('Select a product, an AOI, and inclusive start and end months before submitting.')
      return
    }
    if (startMonth > endMonth) {
      setError('The start month must be on or before the end month.')
      return
    }
    if (missions.length > 0 && requestSources.length === 0) {
      setError('Select at least one compatible source mission.')
      return
    }
    if (requestProduct?.supportedFrequencies.length && !requestFrequency) {
      setError('Select a temporal frequency declared by the product.')
      return
    }
    if (!estimate) {
      setError('Wait for the cost estimate before submitting this request.')
      return
    }
    if (estimate.admission !== 'ADMITTED') {
      setError(
        estimate.admission === 'INSUFFICIENT_CREDITS'
          ? 'The current credit balance cannot admit this request.'
          : 'The credit balance is unavailable, so admission cannot be decided.',
      )
      return
    }
    const resolution = requestResolution ? Number(requestResolution) : null
    const allMissionsSelected =
      missions.length > 0 && requestSources.length === missions.map((mission) => mission.id).length
    try {
      const request = receive(
        await createAnalysisRequest({
          productId: requestProductId,
          aoiId: requestAoiId,
          startMonth,
          endMonth,
          spatialResolutionM: resolution,
          sources: allMissionsSelected ? [] : requestSources,
          temporalFrequency: requestFrequency || null,
        }),
      )
      setRequests((current) => replaceById(current, request))
      setEstimate(null)
      setPanel('requests')
    } catch (reason) {
      showError('Analysis request could not be submitted', reason)
    }
  }

  async function refreshRequest(id: string): Promise<void> {
    try {
      const request = receive(await getAnalysisRequest(id))
      setRequests((current) => replaceById(current, request))
    } catch (reason) {
      showError('Request status could not be refreshed', reason)
    }
  }

  async function confirmRequest(id: string): Promise<void> {
    try {
      const request = receive(await confirmAnalysisRequest(id))
      setRequests((current) => replaceById(current, request))
    } catch (reason) {
      showError('Request could not be confirmed', reason)
    }
  }

  async function cancelRequest(id: string): Promise<void> {
    try {
      const request = receive(await cancelAnalysisRequest(id))
      setRequests((current) => replaceById(current, request))
    } catch (reason) {
      showError('Request could not be cancelled', reason)
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
      clearSelection()
      setInspectorOpen(true)
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

  function clearSelection(): void {
    setSelectionMode('none')
    setSelectionPoint(null)
    setSelectionVertices([])
    setSelectionReuse(null)
    setSelectionSource(null)
    setSeries(null)
    setSeriesError(null)
    setTemporalFilters(EMPTY_TEMPORAL_FILTERS)
    setChartOpen(false)
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

  function openAccount(): void {
    setAccountOpen(false)
    setSearchOpen(false)
    setPanel('account')
    if (sessionActive) void refreshBalance()
  }

  function signOut(): void {
    setSessionActive(false)
    setAccount(null)
    setCreditBalance(null)
    setProducts([])
    setAois([])
    setRequests([])
    clearSelection()
    setResultMap(null)
    setResultDetail(null)
    setDisplayedRequest(null)
  }

  function signIn(): void {
    setSessionActive(true)
    setPanel(null)
  }

  function togglePanel(nextPanel: Panel): void {
    setPanel((current) => (current === nextPanel ? null : nextPanel))
  }

  const suggestions = buildSearchSuggestions(searchQuery, aois)
  const highlightedSuggestion = suggestions.length
    ? Math.min(activeSuggestion, suggestions.length - 1)
    : -1

  function chooseSuggestion(suggestion: SearchSuggestion): void {
    searchInputRef.current?.blur()
    setSearchOpen(false)
    setActiveSuggestion(0)
    setSearchQuery(suggestion.label)
    if (suggestion.kind === 'aoi' && suggestion.aoiId) {
      setPanel('aois')
      void selectAoi(suggestion.aoiId, { reserveRightPanel: true })
      return
    }
    if (suggestion.focus) applyFocus(suggestion.focus)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (suggestions.length === 0) {
      setSearchOpen(true)
      return
    }
    chooseSuggestion(suggestions[highlightedSuggestion])
  }

  function changeSearch(value: string): void {
    setSearchQuery(value)
    setSearchOpen(true)
    setActiveSuggestion(0)
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      if (searchOpen) {
        event.stopPropagation()
        setSearchOpen(false)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSearchOpen(true)
      if (suggestions.length) {
        setActiveSuggestion((index) => (index + 1) % suggestions.length)
      }
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (suggestions.length) {
        setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length)
      }
      return
    }
    if (event.key === 'Enter' && searchOpen && suggestions.length) {
      event.preventDefault()
      chooseSuggestion(suggestions[highlightedSuggestion])
    }
  }

  const creditSummary =
    isLoading.balance && !creditBalance
      ? 'Loading credits'
      : creditBalance
        ? `${creditBalance.balance} ${creditBalance.unit ?? 'credits'}`
        : 'Unavailable'

  const selectedAoi = aois.find((aoi) => aoi.id === selectedAoiId) ?? null
  const visibleAois = aois.filter((aoi) => aoi.name.toLowerCase().includes(aoiQuery.toLowerCase()))
  const requestProduct =
    products.find((product) => product.id === requestProductId) ??
    (selectedProduct?.id === requestProductId ? selectedProduct : null)
  const displayedProductName = (id: string | null): string | null =>
    products.find((product) => product.id === id)?.name ?? null
  const displayedAoiName = (id: string | null): string | null =>
    aois.find((aoi) => aoi.id === id)?.name ?? null
  const draftAreaKm2 = verticesAreaKm2(draftVertices)
  const draftAreaExceeded = draftAreaKm2 !== null && draftAreaKm2 > AOI_MAX_AREA_KM2
  const nativeResolutionNote = requestProduct?.nativeResolution
    ? `Declared native resolution: ${requestProduct.nativeResolution}. A request cannot reveal detail finer than the source data.`
    : 'Selecting a pixel size cannot reveal detail finer than the source data.'
  const selectionLatitudes = (): number[] => {
    if (selectionPoint) return [selectionPoint.lat]
    if (selectionReuse) return geometryToVertices(selectionReuse).map((position) => position.lat)
    return selectionVertices.map((position) => position.lat)
  }
  const seriesHemisphere = hemisphereForLatitudes(selectionLatitudes())
  const filteredSeriesPoints = series
    ? filterSeriesPoints(series.points, temporalFilters, seriesHemisphere)
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
  const resultProductName =
    resultDetail?.productName ??
    displayedProductName(displayedRequest?.productId ?? null) ??
    displayedRequest?.productId ??
    'Result'
  const resultPeriodLabel =
    displayedRequest?.startMonth && displayedRequest?.endMonth
      ? `${displayedRequest.startMonth} to ${displayedRequest.endMonth} UTC`
      : 'Period unavailable'
  const allMissionsSelected = missions.length > 0 && requestSources.length === missions.length
  const requestFrequencyOptions = requestProduct?.supportedFrequencies ?? []
  const admissionLabel = estimate
    ? estimate.admission === 'ADMITTED'
      ? 'Admitted'
      : estimate.admission === 'INSUFFICIENT_CREDITS'
        ? 'Insufficient credits'
        : 'Balance unavailable'
    : null
  const canSubmit =
    Boolean(requestProductId && requestAoiId && startMonth && endMonth) &&
    startMonth <= endMonth &&
    (missions.length === 0 || requestSources.length > 0) &&
    Boolean(requestProduct) &&
    requestFrequencyOptions.length > 0 &&
    Boolean(requestFrequency) &&
    estimate?.admission === 'ADMITTED'

  return (
    <main className={panel ? 'workspace panel-open' : 'workspace'}>
      <MapSurface
        aois={aois}
        draftVertices={draftVertices}
        drawing={drawing}
        focus={focus}
        focusRevision={focusRevision}
        resultMap={resultMap}
        resultVisible={resultVisible}
        selectionMode={selectionMode}
        selectionPoint={selectionPoint}
        selectionVertices={selectionVertices}
        selectedAoiId={selectedAoiId}
        onMapClick={(position) =>
          setDraftVertices((vertices) => (drawing ? [...vertices, position] : vertices))
        }
        onResultClick={handleResultClick}
        onAoiSelect={(id) => void selectAoi(id)}
      />

      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand" role="img" aria-label="MEOGAP">
            <Logo size={30} />
            <span className="brand-wordmark">MEOGAP</span>
          </div>
          <span className="topbar-divider" aria-hidden="true" />
          <nav className="main-nav" aria-label="Main navigation">
            <NavButton
              active={panel === 'catalogue'}
              icon="compass"
              label="Explore"
              onClick={() => togglePanel('catalogue')}
            />
            <NavButton
              active={panel === 'requests'}
              icon="clipboard"
              label="Requests"
              onClick={() => togglePanel('requests')}
              badge={activeRequestCount}
            />
            <NavButton
              active={panel === 'indicators'}
              icon="activity"
              label="Indicators"
              onClick={() => togglePanel('indicators')}
            />
          </nav>
        </div>

        <form
          ref={searchContainerRef}
          className="header-search"
          role="search"
          onSubmit={submitSearch}
        >
          <Icon name="search" className="header-search-icon" />
          <input
            ref={searchInputRef}
            id="geographic-search"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={searchOpen}
            aria-controls="geographic-search-suggestions"
            aria-activedescendant={
              searchOpen && highlightedSuggestion >= 0
                ? `search-suggestion-${highlightedSuggestion}`
                : undefined
            }
            aria-label="Search location"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search location (place, coordinates...)"
            value={searchQuery}
            onChange={(event) => changeSearch(event.target.value)}
            onFocus={() => {
              if (searchQuery.trim()) setSearchOpen(true)
            }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery ? (
            <button
              type="button"
              className="header-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery('')
                setSearchOpen(false)
                searchInputRef.current?.focus()
              }}
            >
              <Icon name="close" size={14} />
            </button>
          ) : null}
          <kbd className="search-shortcut">Ctrl K</kbd>
          {searchOpen ? (
            <div
              className="search-suggestions"
              id="geographic-search-suggestions"
              role="listbox"
              aria-label="Location suggestions"
            >
              {suggestions.length ? (
                <ul role="presentation">
                  {suggestions.map((suggestion, index) => (
                    <li key={suggestion.id} role="presentation">
                      <button
                        id={`search-suggestion-${index}`}
                        type="button"
                        role="option"
                        aria-selected={index === highlightedSuggestion}
                        tabIndex={-1}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseSuggestion(suggestion)}
                      >
                        <span className="search-suggestion-icon">
                          <Icon name={suggestion.icon} size={16} />
                        </span>
                        <span className="search-suggestion-copy">
                          <strong>{suggestion.label}</strong>
                          <small>{suggestion.detail}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="search-suggestions-empty">
                  No matching place, coordinates, or saved AOI.
                </p>
              )}
            </div>
          ) : null}
        </form>

        <div className="topbar-meta">
          <button
            type="button"
            className="credits-chip"
            onClick={openAccount}
            aria-label={`Credit balance: ${creditSummary}. Open account and credits.`}
            title={`Credit balance: ${creditSummary}`}
          >
            <Icon name="credit-card" />
            <span className="credits-value">{creditSummary}</span>
          </button>
          <div className="account-menu" ref={accountMenuRef}>
            <button
              ref={accountButtonRef}
              type="button"
              className={
                panel === 'account' || accountOpen
                  ? 'account-button account-button-active'
                  : 'account-button'
              }
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label="Account menu"
              title="Account menu"
              onClick={() => {
                setSearchOpen(false)
                setAccountOpen((open) => !open)
              }}
            >
              <Icon name="user" />
              <Icon name="chevron-down" size={14} className="account-caret" />
            </button>
            {accountOpen ? (
              <div className="account-dropdown" role="menu" aria-label="Account">
                <div className="account-dropdown-header">
                  <span>
                    {account?.displayName ?? (sessionActive ? 'Demo account' : 'Signed out')}
                  </span>
                  <strong>{sessionActive ? creditSummary : 'No active session'}</strong>
                </div>
                <button type="button" role="menuitem" onClick={openAccount}>
                  <Icon name="credit-card" />
                  <span>Account and credits</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountOpen(false)
                    void refreshBalance()
                  }}
                >
                  <Icon name="refresh" />
                  <span>Refresh credit balance</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <aside className="map-toolbar" aria-label="Map tools">
        <button
          type="button"
          onClick={() => setPanel('aois')}
          aria-label="Open AOI library"
          title="Open AOI library"
        >
          <Icon name="layers" />
          <span>Areas</span>
        </button>
        <button
          type="button"
          onClick={() => beginNewAoi()}
          aria-label="Draw a new AOI polygon"
          title="Draw a new AOI polygon"
        >
          <Icon name="pencil" />
          <span>Draw</span>
        </button>
      </aside>

      <div className="notice-stack">
        {isDemo ? (
          <p className="demo-notice" role="status">
            <Icon name="info" />
            <span>Demo data: this workspace is not showing real EO processing.</span>
          </p>
        ) : null}

        {error ? (
          <div className="error-notice" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              title="Dismiss error"
            >
              <Icon name="close" />
            </button>
          </div>
        ) : null}
      </div>

      {panel === 'catalogue' ? (
        <OverlayPanel
          title="Product catalogue"
          icon={<Icon name="compass" />}
          onClose={() => setPanel(null)}
        >
          <p className="panel-intro">
            Explore scientific products, then configure a separate analysis request.
          </p>
          {isLoading.catalogue ? (
            <StateNotice icon="refresh">Loading catalogue…</StateNotice>
          ) : null}
          {!isLoading.catalogue && loadErrors.catalogue ? (
            <StateNotice icon="alert" tone="error">
              <p>The product catalogue is unavailable.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadCatalogue()}
              >
                Retry
              </button>
            </StateNotice>
          ) : null}
          {!isLoading.catalogue && !loadErrors.catalogue && products.length === 0 ? (
            <StateNotice icon="image">No products are available yet.</StateNotice>
          ) : null}
          <div className="product-list" aria-label="Products">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={product.id === selectedProductId}
                onSelect={() => void selectProduct(product.id)}
              />
            ))}
          </div>
          {selectedProduct ? (
            <section
              className="detail-section product-detail"
              aria-label="Selected product details"
            >
              <ProductPreview product={selectedProduct} />
              <h3>{selectedProduct.name}</h3>
              <p>{selectedProduct.description ?? 'No product description was supplied.'}</p>
              <button
                type="button"
                className="button button-primary button-wide"
                onClick={() => openRequest(selectedProduct.id)}
              >
                <Icon name="plus" />
                Configure request
              </button>
              <dl className="metadata-grid">
                <dt>Processing level</dt>
                <dd>{selectedProduct.level ?? 'Unavailable'}</dd>
                <dt>Category</dt>
                <dd>{selectedProduct.category ?? 'Unavailable'}</dd>
                <dt>Native resolution</dt>
                <dd>{selectedProduct.nativeResolution ?? 'Unavailable'}</dd>
                <dt>Temporal resolution</dt>
                <dd>{selectedProduct.temporalResolution ?? 'Unavailable'}</dd>
                <dt>Units</dt>
                <dd>{selectedProduct.units ?? 'Unavailable'}</dd>
                <dt>Availability</dt>
                <dd>{selectedProduct.availability ?? 'Unavailable'}</dd>
                <dt>Scientific validation</dt>
                <dd>{selectedProduct.validationStatus ?? 'Unavailable'}</dd>
                <dt>Spatial inputs</dt>
                <dd>
                  {selectedProduct.supportedSpatialInputs.length
                    ? selectedProduct.supportedSpatialInputs.join(', ')
                    : 'Unavailable'}
                </dd>
                <dt>Temporal frequencies</dt>
                <dd>
                  {selectedProduct.supportedFrequencies.length
                    ? selectedProduct.supportedFrequencies.join(', ')
                    : 'Unavailable'}
                </dd>
                <dt>Maximum period</dt>
                <dd>
                  {selectedProduct.maxPeriodMonths != null
                    ? `${selectedProduct.maxPeriodMonths} months`
                    : 'Unavailable'}
                </dd>
                <dt>Documentation</dt>
                <dd>{selectedProduct.documentationStatus ?? 'Unavailable'}</dd>
                <dt>Supported sources</dt>
                <dd>
                  {selectedProduct.supportedSources.length
                    ? selectedProduct.supportedSources.join(', ')
                    : 'Unavailable'}
                </dd>
              </dl>
              {missionsProductId === selectedProduct.id ? (
                <div className="requirements">
                  <h4>Compatible mission metadata</h4>
                  {missionsLoading ? <p>Loading compatible missions…</p> : null}
                  {missionsError ? (
                    <p className="failure-text">Mission metadata unavailable: {missionsError}</p>
                  ) : null}
                  {missions.length ? (
                    <ul>
                      {missions.map((mission) => (
                        <li key={mission.id}>
                          {mission.name} · {mission.provider} · {mission.instrument} · native{' '}
                          {mission.nativeResolution}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {selectedProduct.limitations.length ? (
                <div className="requirements">
                  <h4>Known limitations</h4>
                  <ul>
                    {selectedProduct.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {requirements ? (
                <div className="requirements">
                  <h4>Scientific input requirements</h4>
                  {requirements.inputs.length ? (
                    <ul>
                      {requirements.inputs.map((input) => (
                        <li key={input}>{input}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No specific inputs are declared.</p>
                  )}
                  {requirements.limitations.length ? (
                    <>
                      <h4>Limitations</h4>
                      <ul>
                        {requirements.limitations.map((limitation) => (
                          <li key={limitation}>{limitation}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {requirements.note ? <p className="muted">{requirements.note}</p> : null}
                </div>
              ) : (
                <StateNotice icon="refresh">Loading input requirements…</StateNotice>
              )}
            </section>
          ) : null}
        </OverlayPanel>
      ) : null}

      {panel === 'aois' ? (
        <OverlayPanel
          title="AOI library"
          icon={<Icon name="layers" />}
          onClose={() => setPanel(null)}
        >
          <p className="panel-intro">
            Saved areas are reusable. Editing or deleting one never changes a submitted request
            snapshot.
          </p>
          <div className="inline-actions">
            <button type="button" className="button button-primary" onClick={() => beginNewAoi()}>
              <Icon name="plus" />
              Draw new area
            </button>
            {selectedAoi ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => beginEditAoi(selectedAoi)}
              >
                <Icon name="pencil" />
                Edit selected
              </button>
            ) : null}
          </div>
          <label className="field-label" htmlFor="aoi-filter">
            Find saved AOIs
          </label>
          <input
            id="aoi-filter"
            value={aoiQuery}
            onChange={(event) => setAoiQuery(event.target.value)}
            placeholder="Search by name"
          />
          {isLoading.aois ? <StateNotice icon="refresh">Loading saved AOIs…</StateNotice> : null}
          {!isLoading.aois && loadErrors.aois ? (
            <StateNotice icon="alert" tone="error">
              <p>The AOI library is unavailable.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadAois()}
              >
                Retry
              </button>
            </StateNotice>
          ) : null}
          {!isLoading.aois && !loadErrors.aois && visibleAois.length === 0 ? (
            <StateNotice icon="map-pin">No saved AOIs match this search.</StateNotice>
          ) : null}
          <div className="aoi-list">
            {visibleAois.map((aoi) => (
              <button
                key={aoi.id}
                type="button"
                className={aoi.id === selectedAoiId ? 'list-item list-item-selected' : 'list-item'}
                onClick={() => void selectAoi(aoi.id)}
              >
                <span className="list-item-icon">
                  <Icon name="map-pin" />
                </span>
                <span className="list-item-body">
                  <strong>{aoi.name}</strong>
                  <span>Revision {aoi.revision}</span>
                </span>
                {aoi.id === selectedAoiId ? <Icon name="check" /> : null}
              </button>
            ))}
          </div>
          {selectedAoi ? (
            <section className="detail-section">
              <h3>{selectedAoi.name}</h3>
              <p>{selectedAoi.description ?? 'No AOI description.'}</p>
              {deleteCandidateId === selectedAoi.id ? (
                <div className="confirm-delete">
                  <p>Delete this saved AOI? Existing request snapshots are unaffected.</p>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => void removeAoi(selectedAoi.id)}
                    >
                      <Icon name="trash" />
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setDeleteCandidateId(null)}
                    >
                      Keep AOI
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => setDeleteCandidateId(selectedAoi.id)}
                >
                  <Icon name="trash" />
                  Delete selected
                </button>
              )}
            </section>
          ) : null}
          {drawing ? (
            <section
              ref={drawingFormRef}
              className="detail-section drawing-form"
              aria-label="AOI drawing form"
            >
              <div className="drawing-heading">
                <h3>{editingAoiId ? 'Edit saved area' : 'Draw a new area'}</h3>
                <span className={editingAoiId ? 'drawing-badge badge-editing' : 'drawing-badge'}>
                  {editingAoiId ? 'Editing' : 'Draft'}
                </span>
              </div>
              <p>
                Click the map to add boundary points. {draftVertices.length} boundary point
                {draftVertices.length === 1 ? '' : 's'} selected.
              </p>
              {draftAreaKm2 !== null ? (
                <p className="draft-area">
                  Area: <strong>{formatAreaKm2(draftAreaKm2)}</strong> / maximum {AOI_MAX_AREA_KM2}{' '}
                  km²
                </p>
              ) : null}
              {draftAreaExceeded ? (
                <p className="failure-text" role="alert">
                  {AOI_AREA_LIMIT_MESSAGE}
                </p>
              ) : null}
              {editingAoiId ? (
                <p className="muted">
                  Saving replaces the boundary while preserving the existing AOI identity.
                </p>
              ) : null}
              <label className="field-label" htmlFor="aoi-name">
                Area name
              </label>
              <input
                id="aoi-name"
                value={aoiName}
                onChange={(event) => setAoiName(event.target.value)}
              />
              <label className="field-label" htmlFor="aoi-description">
                Description
              </label>
              <textarea
                id="aoi-description"
                value={aoiDescription}
                onChange={(event) => setAoiDescription(event.target.value)}
              />
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setDraftVertices((vertices) => vertices.slice(0, -1))}
                  disabled={draftVertices.length === 0}
                  title="Remove the last boundary point"
                >
                  <Icon name="undo" />
                  Undo last point
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={resetDraftBoundary}
                  disabled={draftVertices.length === 0}
                  title="Clear the current draft without deleting saved AOIs"
                >
                  <Icon name="rotate" />
                  Reset drawing
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void saveAoi()}
                  disabled={draftVertices.length < 3 || draftAreaExceeded}
                >
                  <Icon name="check" />
                  Save AOI
                </button>
                <button type="button" className="button button-secondary" onClick={discardDraft}>
                  <Icon name="close" />
                  Discard drawing
                </button>
              </div>
            </section>
          ) : null}
        </OverlayPanel>
      ) : null}

      {panel === 'request' ? (
        <OverlayPanel
          title="New analysis request"
          icon={<Icon name="plus" />}
          onClose={() => setPanel(null)}
        >
          <p className="panel-intro">
            Configure the scientific constraints, then submit. Confirmation of a proposal is a
            separate action.
          </p>
          <label className="field-label" htmlFor="request-product">
            Product
          </label>
          <select
            id="request-product"
            value={requestProductId}
            onChange={(event) => changeRequestProduct(event.target.value)}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <label className="field-label" htmlFor="request-aoi">
            Saved AOI
          </label>
          <select
            id="request-aoi"
            value={requestAoiId}
            onChange={(event) => {
              setRequestAoiId(event.target.value)
              setEstimate(null)
              setEstimateError(null)
            }}
          >
            <option value="">Select a saved AOI</option>
            {aois.map((aoi) => (
              <option key={aoi.id} value={aoi.id}>
                {aoi.name}
              </option>
            ))}
          </select>
          <button type="button" className="text-button" onClick={() => beginNewAoi(true)}>
            <Icon name="plus" />
            Create a saved AOI
          </button>
          <p className="field-help">
            M0 requests use an AOI. POI and LOI request inputs require server-side buffering and are
            not available in this build.
          </p>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="start-month">
                Start month (UTC)
              </label>
              <input
                id="start-month"
                type="month"
                value={startMonth}
                onChange={(event) => {
                  setStartMonth(event.target.value)
                  setEstimate(null)
                  setEstimateError(null)
                }}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="end-month">
                End month (UTC)
              </label>
              <input
                id="end-month"
                type="month"
                value={endMonth}
                onChange={(event) => {
                  setEndMonth(event.target.value)
                  setEstimate(null)
                  setEstimateError(null)
                }}
              />
            </div>
          </div>
          {startMonth && endMonth && startMonth > endMonth ? (
            <p className="failure-text" role="alert">
              The start month must be on or before the end month.
            </p>
          ) : null}
          {!requestProductId || !requestAoiId || !startMonth || !endMonth ? (
            <p className="field-help">
              Select a product, an AOI and an inclusive UTC period before submitting.
            </p>
          ) : null}

          <div className="field">
            <label className="field-label" htmlFor="request-frequency">
              Temporal frequency
            </label>
            <select
              id="request-frequency"
              value={requestFrequency}
              disabled={!requestProduct || requestFrequencyOptions.length === 0}
              onChange={(event) => {
                setRequestFrequency(event.target.value as TemporalFrequency | '')
                setEstimate(null)
                setEstimateError(null)
              }}
            >
              <option value="">Select a temporal frequency</option>
              {requestFrequencyOptions.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {TEMPORAL_FREQUENCY_LABELS[frequency]}
                </option>
              ))}
            </select>
            {!requestProduct ? (
              <p className="field-help">
                Select a product to load its declared temporal frequencies.
              </p>
            ) : null}
            {requestProduct && requestFrequencyOptions.length === 0 ? (
              <p className="failure-text">
                This product declares no supported temporal frequency. Submission is disabled.
              </p>
            ) : null}
            {requestProduct && requestFrequencyOptions.length > 0 && !requestFrequency ? (
              <p className="field-help">
                Choose one of the product-declared temporal frequencies. No default is assumed.
              </p>
            ) : null}
          </div>

          {missionsLoading ? (
            <StateNotice icon="refresh">Loading compatible missions…</StateNotice>
          ) : null}
          {!missionsLoading && missionsError ? (
            <StateNotice icon="alert" tone="error">
              Compatible missions are unavailable: {missionsError}
            </StateNotice>
          ) : null}
          {!missionsLoading && !missionsError && missions.length === 0 ? (
            <StateNotice icon="info">
              No source mission is compatible with this product. Submission is disabled.
            </StateNotice>
          ) : null}
          {missions.length ? (
            <fieldset className="choice-group">
              <legend>Source missions</legend>
              <p className="field-help">
                All compatible missions are selected by default. Removing every restriction sends no
                source filter; usable acquisitions are never guaranteed.
              </p>
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={selectAllRequestSources}
                  disabled={allMissionsSelected}
                >
                  <Icon name="check" />
                  Select all compatible missions
                </button>
              </div>
              <div className="checkbox-grid">
                {missions.map((mission) => (
                  <label
                    className="checkbox"
                    key={mission.id}
                    title={`${mission.provider} · ${mission.instrument}`}
                  >
                    <input
                      type="checkbox"
                      checked={requestSources.includes(mission.id)}
                      onChange={() => toggleRequestSource(mission.id)}
                    />
                    <span>{mission.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {requestProduct && requestProduct.supportedResolutionsM.length ? (
            <div className="field">
              <label className="field-label" htmlFor="request-resolution">
                Maximum allowed pixel size (m)
              </label>
              <select
                id="request-resolution"
                value={requestResolution}
                onChange={(event) => {
                  setRequestResolution(event.target.value)
                  setEstimate(null)
                  setEstimateError(null)
                }}
              >
                <option value="">No maximum (use native resolution)</option>
                {requestProduct.supportedResolutionsM.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution} m
                  </option>
                ))}
              </select>
              <p className="field-help">{nativeResolutionNote}</p>
            </div>
          ) : null}

          {requestProduct ? (
            <div className="request-product-summary">
              <span className="eyebrow">Selected product</span>
              <strong>{requestProduct.name}</strong>
              <span>
                {requestProduct.level ?? 'Level unavailable'} ·{' '}
                {requestProduct.nativeResolution
                  ? `Native ${requestProduct.nativeResolution}`
                  : 'Native resolution unavailable'}
              </span>
              <span>
                Inputs:{' '}
                {requestProduct.supportedSpatialInputs.length
                  ? requestProduct.supportedSpatialInputs.join(', ')
                  : 'Unavailable'}
                {' · '}Max period:{' '}
                {requestProduct.maxPeriodMonths != null
                  ? `${requestProduct.maxPeriodMonths} months`
                  : 'Unavailable'}
              </span>
            </div>
          ) : null}

          <div className="cost-estimate" aria-label="Cost estimate">
            <h4>Cost and admission</h4>
            {estimating ? <p role="status">Estimating cost…</p> : null}
            {estimateError ? (
              <p className="failure-text">Estimate unavailable: {estimateError}</p>
            ) : null}
            {estimate ? (
              <dl className="metadata-grid">
                <dt>Estimated cost</dt>
                <dd>
                  {estimate.estimatedCredits} {estimate.currency}
                </dd>
                <dt>Current balance</dt>
                <dd>
                  {estimate.balanceAvailable && estimate.balance !== null
                    ? `${estimate.balance} ${estimate.currency}`
                    : 'Unavailable'}
                </dd>
                <dt>Admission</dt>
                <dd className={`admission admission-${estimate.admission.toLowerCase()}`}>
                  {admissionLabel}
                </dd>
              </dl>
            ) : null}
            {!estimate && !estimating && !estimateError ? (
              <p className="field-help">
                Complete the product, AOI and UTC period to display the cost and admission decision.
              </p>
            ) : null}
          </div>

          <div className="panel-footer">
            <button
              type="button"
              className="button button-primary button-wide"
              onClick={() => void submitRequest()}
              disabled={!canSubmit}
            >
              <Icon name="check" />
              Submit request
            </button>
          </div>
        </OverlayPanel>
      ) : null}

      {panel === 'requests' ? (
        <OverlayPanel
          title="Analysis requests"
          icon={<Icon name="clipboard" />}
          onClose={() => setPanel(null)}
        >
          <div className="panel-toolbar">
            <p className="panel-intro">
              Request state is retrieved from REST. Completed does not imply scientific validation
              or complete observations.
            </p>
            <div className="inline-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadRequests()}
              >
                <Icon name="refresh" />
                Refresh requests
              </button>
              <button type="button" className="button button-primary" onClick={() => openRequest()}>
                <Icon name="plus" />
                New request
              </button>
            </div>
          </div>
          {hasActiveRequests ? (
            <p className="polling-note" role="status">
              <Icon name="refresh" />
              Active request states update automatically.
            </p>
          ) : null}
          {isLoading.requests ? <StateNotice icon="refresh">Loading requests…</StateNotice> : null}
          {!isLoading.requests && loadErrors.requests ? (
            <StateNotice icon="alert" tone="error">
              <p>Requests are unavailable.</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadRequests()}
              >
                Retry
              </button>
            </StateNotice>
          ) : null}
          {!isLoading.requests && !loadErrors.requests && requests.length === 0 ? (
            <StateNotice icon="clipboard">No analysis requests are available.</StateNotice>
          ) : null}
          <div className="request-list">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                productName={displayedProductName(request.productId)}
                aoiName={displayedAoiName(request.aoiId)}
                onRefresh={(id) => void refreshRequest(id)}
                onConfirm={(id) => void confirmRequest(id)}
                onCancel={(id) => void cancelRequest(id)}
                onDisplay={(nextRequest) => void displayResult(nextRequest)}
                onDelivery={(nextRequest, kind) => void requestDelivery(nextRequest, kind)}
                delivery={deliveries[request.id] ?? null}
                onRefreshDelivery={(requestId, deliveryId) =>
                  void refreshDelivery(requestId, deliveryId)
                }
              />
            ))}
          </div>
        </OverlayPanel>
      ) : null}

      {panel === 'indicators' ? (
        <OverlayPanel
          title="Indicators"
          icon={<Icon name="activity" />}
          onClose={() => setPanel(null)}
        >
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon name="activity" size={26} />
            </span>
            <h3>No indicators are configured.</h3>
            <p>
              Indicators are a later monitoring capability. They are not required to compute or
              explore scientific products.
            </p>
          </div>
        </OverlayPanel>
      ) : null}

      {panel === 'account' ? (
        <OverlayPanel
          title="Account and credits"
          icon={<Icon name="user" />}
          onClose={() => setPanel(null)}
        >
          <p className="panel-intro">
            Identity and credit balances are supplied by the server. This demonstration does not
            implement production authentication.
          </p>
          {!sessionActive ? (
            <div className="empty-state">
              <h3>Signed out</h3>
              <p>Requests, AOIs and results are hidden until a demo session is resumed.</p>
              <button type="button" className="button button-primary" onClick={signIn}>
                Sign in as demo user
              </button>
            </div>
          ) : (
            <>
              <div className="credit-card">
                <span>Signed in as</span>
                <strong>{account?.displayName ?? 'Demo account'}</strong>
                {account ? <span>User {account.userId}</span> : null}
              </div>
              {isLoading.balance ? (
                <StateNotice icon="refresh">Loading credit balance…</StateNotice>
              ) : null}
              {!isLoading.balance && creditBalance ? (
                <div className="credit-card">
                  <span>Available balance</span>
                  <strong>
                    {creditBalance.balance} {creditBalance.unit ?? 'credits'}
                  </strong>
                </div>
              ) : null}
              {!isLoading.balance && !creditBalance ? (
                <StateNotice icon="info">Credit balance is unavailable.</StateNotice>
              ) : null}
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => void refreshBalance()}
                >
                  <Icon name="refresh" />
                  Refresh balance
                </button>
                <button type="button" className="button button-danger" onClick={signOut}>
                  <Icon name="close" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </OverlayPanel>
      ) : null}

      <section
        className={inspectorOpen ? 'bottom-inspector inspector-open' : 'bottom-inspector'}
        aria-label="Result inspector"
      >
        <button
          type="button"
          className="inspector-toggle"
          onClick={() => setInspectorOpen((open) => !open)}
          aria-expanded={inspectorOpen}
        >
          <Icon name={inspectorOpen ? 'chevron-down' : 'chevron-up'} />
          <span>{inspectorOpen ? 'Hide result inspector' : 'Show result inspector'}</span>
        </button>
        {inspectorOpen ? (
          <div className="inspector-content">
            <div className="inspector-summary">
              <span className="eyebrow">Result inspector</span>
              {displayedRequest?.resultId ? (
                <>
                  <p>
                    Result <strong>{displayedRequest.resultId}</strong> from request{' '}
                    {displayedRequest.id}
                    {resultDetail ? ` · version ${resultDetail.resultVersion}` : ''}
                  </p>
                  <dl className="metadata-grid inspector-metadata">
                    <dt>Product</dt>
                    <dd>
                      {resultDetail?.productName ?? displayedRequest.productId ?? 'Unavailable'}
                    </dd>
                    <dt>Period</dt>
                    <dd>
                      {displayedRequest.startMonth && displayedRequest.endMonth
                        ? `${displayedRequest.startMonth} to ${displayedRequest.endMonth} UTC`
                        : 'Unavailable'}
                    </dd>
                    <dt>Temporal frequency</dt>
                    <dd>
                      {temporalFrequencyLabel(
                        displayedRequest.temporalFrequency ??
                          resultDetail?.temporalFrequency ??
                          null,
                      )}
                    </dd>
                    <dt>Units</dt>
                    <dd>{resultDetail?.units ?? resultMap?.units ?? 'Unavailable'}</dd>
                    <dt>Quality</dt>
                    <dd>
                      {resultDetail?.qualityStatus ?? resultMap?.qualityStatus ?? 'Unavailable'}
                    </dd>
                    <dt>Scientific validation</dt>
                    <dd>
                      {resultDetail?.validationStatus ??
                        resultMap?.validationStatus ??
                        'Unavailable'}
                    </dd>
                    <dt>Provenance</dt>
                    <dd>
                      {resultDetail?.provenanceNote ??
                        resultMap?.qualityNote ??
                        'No provenance is available for this demo result.'}
                    </dd>
                  </dl>
                </>
              ) : (
                <p>No result representation selected.</p>
              )}
              {resultMap ? (
                <div className="inline-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setResultVisible((visible) => !visible)}
                    aria-pressed={resultVisible}
                  >
                    <Icon name="layers" />
                    {resultVisible ? 'Hide result layer' : 'Show result layer'}
                  </button>
                </div>
              ) : (
                <p>Select “Display on map” for a completed request to load a representation.</p>
              )}
              <p className="muted">
                Result layers are synthetic/demo representations, distinct from the satellite
                basemap and from scientifically validated products.
              </p>
            </div>

            {resultMap ? (
              <section className="inspector-selection" aria-label="Spatial selection">
                <h3>Explore this result</h3>
                <p className="field-help">
                  Selection is independent from the request geometry. Coordinates are sent as WKT
                  with an explicit {SELECTION_CRS} CRS.
                </p>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    aria-pressed={selectionMode === 'point'}
                    onClick={startPointSelection}
                  >
                    <Icon name="map-pin" />
                    Select point
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    aria-pressed={selectionMode === 'polygon'}
                    onClick={startPolygonSelection}
                  >
                    <Icon name="pencil" />
                    Draw polygon
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={reuseRequestAoi}
                    disabled={!displayedRequest?.geometrySnapshot}
                  >
                    <Icon name="layers" />
                    Use request AOI
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={useResultGeometry}
                    disabled={!resultDetail?.geometry}
                  >
                    <Icon name="image" />
                    Use result geometry
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={clearSelection}
                  >
                    <Icon name="close" />
                    Clear selection
                  </button>
                </div>
                {selectionMode !== 'none' ? (
                  <p className="polling-note" role="status">
                    <Icon name="info" />
                    {selectionMode === 'point'
                      ? 'Click inside the displayed result to select a point.'
                      : `Click inside the displayed result to add polygon vertices (${selectionVertices.length} added).`}
                  </p>
                ) : null}
                {selectionPoint ? (
                  <p>
                    Point selection: {positionToWktPoint(selectionPoint)} ({SELECTION_CRS})
                  </p>
                ) : null}
                {activeSelectionWkt ? (
                  <pre className="selection-wkt" aria-label="Selected geometry WKT">
                    {activeSelectionWkt}
                  </pre>
                ) : null}
                {selectionVertices.length ? (
                  <div>
                    <p>
                      Polygon selection: {selectionVertices.length} vertices
                      {selectionReuse
                        ? selectionSource === 'result_geometry'
                          ? ' (entire result geometry)'
                          : ' (request AOI)'
                        : ''}
                      .
                    </p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => setSelectionVertices((vertices) => vertices.slice(0, -1))}
                        disabled={selectionVertices.length === 0}
                      >
                        <Icon name="undo" />
                        Undo last point
                      </button>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void openTimeSeries()}
                  disabled={!hasSelection || seriesLoading}
                >
                  <Icon name="activity" />
                  Open time series
                </button>
              </section>
            ) : null}

            {seriesLoading ? (
              <StateNotice icon="refresh">Loading temporal series…</StateNotice>
            ) : null}
            {!seriesLoading && seriesError ? (
              <StateNotice icon="alert" tone="error">
                {seriesError}
              </StateNotice>
            ) : null}
            {!seriesLoading && !seriesError && series ? (
              <p className="field-help">
                Time series loaded. Open the chart workspace to explore periods and display filters
                without submitting a new request.
              </p>
            ) : null}
            {!seriesLoading && !seriesError && !series && resultMap ? (
              <StateNotice icon="activity">
                Select a point, draw a polygon, or reuse a geometry, then open its time series. A
                period without observation will remain a gap, never a zero.
              </StateNotice>
            ) : null}
          </div>
        ) : null}
      </section>

      {chartOpen && series && displayedRequest?.resultId ? (
        <ChartWorkspace
          open={chartOpen}
          onClose={() => setChartOpen(false)}
          productName={resultProductName}
          resultId={displayedRequest.resultId}
          resultVersion={resultDetail?.resultVersion ?? resultMap?.resultVersion ?? null}
          periodLabel={resultPeriodLabel}
          selectionLabel={selectionLabel}
          series={series}
          points={filteredSeriesPoints}
          filters={temporalFilters}
          hemisphere={seriesHemisphere}
          onFiltersChange={setTemporalFilters}
          onResetFilters={() => setTemporalFilters(EMPTY_TEMPORAL_FILTERS)}
        />
      ) : null}
    </main>
  )
}
