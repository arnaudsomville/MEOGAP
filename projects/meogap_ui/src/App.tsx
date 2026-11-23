import { useEffect, useState, type FormEvent } from 'react'
import {
  cancelAnalysisRequest,
  confirmAnalysisRequest,
  createAnalysisRequest,
  createAoi,
  createDelivery,
  deleteAoi,
  getAnalysisRequest,
  getAoi,
  getCreditBalance,
  getDelivery,
  getHealth,
  getProduct,
  getProductRequirements,
  getResultMap,
  listAnalysisRequests,
  listAois,
  listProducts,
  updateAoi,
  type AnalysisRequest,
  type ApiResponse,
  type Aoi,
  type CreditBalance,
  type Delivery,
  type Health,
  type Position,
  type Product,
  type ProductRequirements,
  type ResultMap,
} from './api/client'
import { OverlayPanel } from './components/OverlayPanel'
import { LeafletMapSurface, type MapSurfaceComponent } from './map/LeafletMapSurface'
import {
  geometryToVertices,
  parseCoordinates,
  verticesToPolygon,
  type MapFocus,
} from './map/coordinates'

type Panel = 'catalogue' | 'aois' | 'requests' | 'indicators' | 'account' | 'request' | null

type AppProps = {
  MapSurface?: MapSurfaceComponent
}

const INITIAL_AOI_NAME = ''
const EMPTY_DESCRIPTION = ''
const EMPTY_MONTH = ''

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The Gateway returned an unexpected error.'
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

function RequestCard({
  request,
  onRefresh,
  onConfirm,
  onCancel,
  onDisplay,
  onDelivery,
}: {
  request: AnalysisRequest
  onRefresh: (id: string) => void
  onConfirm: (id: string) => void
  onCancel: (id: string) => void
  onDisplay: (request: AnalysisRequest) => void
  onDelivery: (request: AnalysisRequest) => void
}) {
  const canCancel = !['COMPLETED', 'FAILED', 'CANCELLED'].includes(request.state)
  const hasResult = request.resultId !== null
  return (
    <article className="request-card">
      <div className="request-card-heading">
        <strong>{request.productId ?? 'Analysis request'}</strong>
        <StatusPill state={request.state} />
      </div>
      <p className="muted">Request {request.id}</p>
      {request.startMonth && request.endMonth ? (
        <p>
          UTC months: {request.startMonth} to {request.endMonth}
        </p>
      ) : null}
      {request.estimatedCredits !== null ? (
        <p>Estimated cost: {request.estimatedCredits} credits</p>
      ) : null}
      {request.actualCredits !== null ? <p>Actual cost: {request.actualCredits} credits</p> : null}
      {request.message ? <p className="notice-text">{request.message}</p> : null}
      {request.state === 'PREPARING' ? (
        <p>Preparing a proposal. Refresh to retrieve the current state.</p>
      ) : null}
      {request.state === 'PROPOSED' ? (
        <p>Review the estimate, then explicitly confirm execution.</p>
      ) : null}
      {request.state === 'IN_EXECUTION' ? (
        <p>Execution is in progress. Result availability is not yet guaranteed.</p>
      ) : null}
      {request.state === 'COMPLETED' && !hasResult ? (
        <p>
          Completed, but the Gateway response did not provide a result identifier for map or
          delivery access.
        </p>
      ) : null}
      <div className="card-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onRefresh(request.id)}
        >
          Refresh
        </button>
        {request.state === 'PROPOSED' ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => onConfirm(request.id)}
          >
            Confirm execution
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className="button button-danger"
            onClick={() => onCancel(request.id)}
          >
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
          <button
            type="button"
            className="button button-secondary"
            disabled={!hasResult}
            onClick={() => onDelivery(request)}
          >
            Prepare download
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default function App({ MapSurface = LeafletMapSurface }: AppProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [aois, setAois] = useState<Aoi[]>([])
  const [requests, setRequests] = useState<AnalysisRequest[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [requirements, setRequirements] = useState<ProductRequirements | null>(null)
  const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null)
  const [aoiQuery, setAoiQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [draftVertices, setDraftVertices] = useState<Position[]>([])
  const [drawing, setDrawing] = useState(false)
  const [editingAoiId, setEditingAoiId] = useState<string | null>(null)
  const [resumeRequestAfterAoi, setResumeRequestAfterAoi] = useState(false)
  const [aoiName, setAoiName] = useState(INITIAL_AOI_NAME)
  const [aoiDescription, setAoiDescription] = useState(EMPTY_DESCRIPTION)
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
  const [requestProductId, setRequestProductId] = useState('')
  const [requestAoiId, setRequestAoiId] = useState('')
  const [startMonth, setStartMonth] = useState(EMPTY_MONTH)
  const [endMonth, setEndMonth] = useState(EMPTY_MONTH)
  const [resultMap, setResultMap] = useState<ResultMap | null>(null)
  const [displayedRequest, setDisplayedRequest] = useState<AnalysisRequest | null>(null)
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [isLoading, setIsLoading] = useState({
    catalogue: true,
    aois: true,
    requests: true,
    balance: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  function receive<T>(response: ApiResponse<T>): T {
    if (response.isDemo) setIsDemo(true)
    return response.data
  }

  function showError(action: string, reason: unknown): void {
    setError(`${action}: ${errorMessage(reason)}`)
  }

  useEffect(() => {
    let active = true
    void getHealth()
      .then((response) => {
        if (!active) return
        setHealth(receive(response))
      })
      .catch((reason: unknown) => {
        if (active) showError('Gateway health check failed', reason)
      })
    void listProducts()
      .then((response) => {
        if (!active) return
        setProducts(receive(response))
      })
      .catch((reason: unknown) => {
        if (active) showError('Catalogue could not be loaded', reason)
      })
      .finally(() => {
        if (active) setIsLoading((current) => ({ ...current, catalogue: false }))
      })
    void listAois()
      .then((response) => {
        if (!active) return
        setAois(receive(response))
      })
      .catch((reason: unknown) => {
        if (active) showError('AOI library could not be loaded', reason)
      })
      .finally(() => {
        if (active) setIsLoading((current) => ({ ...current, aois: false }))
      })
    void listAnalysisRequests()
      .then((response) => {
        if (!active) return
        setRequests(receive(response))
      })
      .catch((reason: unknown) => {
        if (active) showError('Requests could not be loaded', reason)
      })
      .finally(() => {
        if (active) setIsLoading((current) => ({ ...current, requests: false }))
      })
    return () => {
      active = false
    }
  }, [])

  async function selectProduct(id: string): Promise<void> {
    setSelectedProductId(id)
    setRequirements(null)
    try {
      const [productResult, requirementsResult] = await Promise.all([
        getProduct(id),
        getProductRequirements(id),
      ])
      setSelectedProduct(receive(productResult))
      setRequirements(receive(requirementsResult))
    } catch (reason) {
      showError('Product details could not be loaded', reason)
    }
  }

  async function selectAoi(id: string): Promise<void> {
    setSelectedAoiId(id)
    try {
      const response = await getAoi(id)
      const aoi = receive(response)
      setAois((current) => replaceById(current, aoi))
      setFocus(geometryToVertices(aoi.geometry)[0] ?? null)
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

  async function saveAoi(): Promise<void> {
    const name = aoiName.trim()
    const geometry = verticesToPolygon(draftVertices)
    if (!name || !geometry) {
      setError('An AOI needs a name and at least three boundary points before it can be saved.')
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
    setPanel('request')
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
    try {
      const request = receive(
        await createAnalysisRequest({
          productId: requestProductId,
          aoiId: requestAoiId,
          startMonth,
          endMonth,
        }),
      )
      setRequests((current) => replaceById(current, request))
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
      const representation = receive(await getResultMap(request.resultId))
      setResultMap(representation)
      if (representation.bounds) {
        const [southwest, northeast] = representation.bounds
        setFocus({
          lat: (southwest.lat + northeast.lat) / 2,
          lng: (southwest.lng + northeast.lng) / 2,
          zoom: 11,
        })
      }
      setDisplayedRequest(request)
      setInspectorOpen(true)
      setPanel(null)
    } catch (reason) {
      showError('Map representation could not be loaded', reason)
    }
  }

  async function requestDelivery(request: AnalysisRequest): Promise<void> {
    if (!request.resultId) return
    try {
      const nextDelivery = receive(await createDelivery(request.resultId))
      setDelivery(nextDelivery)
      setDisplayedRequest(request)
      setInspectorOpen(true)
    } catch (reason) {
      showError('Delivery could not be prepared', reason)
    }
  }

  async function refreshDelivery(): Promise<void> {
    if (!delivery) return
    try {
      setDelivery(receive(await getDelivery(delivery.id)))
    } catch (reason) {
      showError('Delivery status could not be refreshed', reason)
    }
  }

  async function refreshBalance(): Promise<void> {
    setIsLoading((current) => ({ ...current, balance: true }))
    try {
      setCreditBalance(receive(await getCreditBalance()))
    } catch (reason) {
      showError('Credit balance could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, balance: false }))
    }
  }

  function openAccount(): void {
    setPanel('account')
    void refreshBalance()
  }

  function locate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const coordinates = parseCoordinates(locationQuery)
    if (coordinates) {
      setFocus(coordinates)
      return
    }
    setAoiQuery(locationQuery)
    setPanel('aois')
  }

  const selectedAoi = aois.find((aoi) => aoi.id === selectedAoiId) ?? null
  const visibleAois = aois.filter((aoi) => aoi.name.toLowerCase().includes(aoiQuery.toLowerCase()))

  return (
    <main className="workspace">
      <MapSurface
        aois={aois}
        draftVertices={draftVertices}
        drawing={drawing}
        focus={focus}
        resultMap={resultMap}
        selectedAoiId={selectedAoiId}
        onMapClick={(position) =>
          setDraftVertices((vertices) => (drawing ? [...vertices, position] : vertices))
        }
        onAoiSelect={(id) => void selectAoi(id)}
      />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <div>
            <p>MEOGAP</p>
            <span>Earth observation workspace</span>
          </div>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={panel === 'catalogue' ? 'nav-active' : ''}
            onClick={() => setPanel('catalogue')}
          >
            Explore
          </button>
          <button
            type="button"
            className={panel === 'requests' ? 'nav-active' : ''}
            onClick={() => setPanel('requests')}
          >
            Requests
          </button>
          <button
            type="button"
            className={panel === 'indicators' ? 'nav-active' : ''}
            onClick={() => setPanel('indicators')}
          >
            Indicators
          </button>
          <button
            type="button"
            className={panel === 'account' ? 'nav-active' : ''}
            onClick={openAccount}
          >
            Account
          </button>
        </nav>
        <span className={health ? 'gateway-state gateway-online' : 'gateway-state'}>
          {health ? `Gateway ${health.status}` : 'Gateway unavailable'}
        </span>
      </header>

      <form className="location-search" onSubmit={locate}>
        <label htmlFor="location-search">Coordinates or saved AOI</label>
        <div>
          <input
            id="location-search"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Latitude, longitude or AOI name"
          />
          <button type="submit" className="button button-primary">
            Locate
          </button>
        </div>
      </form>

      <aside className="map-toolbar" aria-label="Map tools">
        <button type="button" onClick={() => setPanel('aois')} aria-label="Open AOI library">
          Areas
        </button>
        <button type="button" onClick={() => beginNewAoi()} aria-label="Draw a new AOI polygon">
          Draw
        </button>
        <button type="button" onClick={() => setFocus(null)} aria-label="Reset map view">
          Reset
        </button>
      </aside>

      {isDemo ? (
        <p className="demo-notice" role="status">
          Demo data: this workspace is not showing real EO processing.
        </p>
      ) : null}

      {error ? (
        <div className="error-notice" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            x
          </button>
        </div>
      ) : null}

      {panel === 'catalogue' ? (
        <OverlayPanel title="Product catalogue" onClose={() => setPanel(null)}>
          <p className="panel-intro">
            Select a scientific product before configuring a separate analysis request.
          </p>
          {isLoading.catalogue ? <p>Loading catalogue...</p> : null}
          {!isLoading.catalogue && products.length === 0 ? (
            <p>No products are available from the Gateway.</p>
          ) : null}
          <div className="product-list" aria-label="Products">
            {products.map((product) => (
              <button
                type="button"
                key={product.id}
                className={
                  product.id === selectedProductId ? 'list-item list-item-selected' : 'list-item'
                }
                onClick={() => void selectProduct(product.id)}
              >
                <strong>{product.name}</strong>
                <span>{product.level ?? 'Processing level unavailable'}</span>
              </button>
            ))}
          </div>
          {selectedProduct ? (
            <section className="detail-section" aria-label="Selected product details">
              <h3>{selectedProduct.name}</h3>
              <p>
                {selectedProduct.description ??
                  'No product description was supplied by the Gateway.'}
              </p>
              <dl>
                <dt>Processing level</dt>
                <dd>{selectedProduct.level ?? 'Unavailable'}</dd>
                <dt>Scientific validation</dt>
                <dd>{selectedProduct.validationStatus ?? 'Unavailable'}</dd>
              </dl>
              {requirements ? (
                <pre>{JSON.stringify(requirements, null, 2)}</pre>
              ) : (
                <p>Loading input requirements...</p>
              )}
              <button
                type="button"
                className="button button-primary"
                onClick={() => openRequest(selectedProduct.id)}
              >
                Configure request
              </button>
            </section>
          ) : null}
        </OverlayPanel>
      ) : null}

      {panel === 'aois' ? (
        <OverlayPanel title="AOI library" onClose={() => setPanel(null)}>
          <p className="panel-intro">
            Saved areas are reusable. Editing or deleting one never changes a submitted request
            snapshot.
          </p>
          <div className="inline-actions">
            <button type="button" className="button button-primary" onClick={() => beginNewAoi()}>
              Draw new area
            </button>
            {selectedAoi ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => beginEditAoi(selectedAoi)}
              >
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
          {isLoading.aois ? <p>Loading saved AOIs...</p> : null}
          {!isLoading.aois && visibleAois.length === 0 ? (
            <p>No saved AOIs match this search.</p>
          ) : null}
          <div className="aoi-list">
            {visibleAois.map((aoi) => (
              <button
                key={aoi.id}
                type="button"
                className={aoi.id === selectedAoiId ? 'list-item list-item-selected' : 'list-item'}
                onClick={() => void selectAoi(aoi.id)}
              >
                <strong>{aoi.name}</strong>
                <span>Revision {aoi.revision}</span>
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
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => void removeAoi(selectedAoi.id)}
                  >
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
              ) : (
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => setDeleteCandidateId(selectedAoi.id)}
                >
                  Delete selected
                </button>
              )}
            </section>
          ) : null}
          {drawing ? (
            <section className="detail-section drawing-form" aria-label="AOI drawing form">
              <h3>{editingAoiId ? 'Replace area boundary' : 'Save drawn area'}</h3>
              <p>Click the map to add points. {draftVertices.length} boundary points selected.</p>
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
                >
                  Undo point
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setDraftVertices([])}
                >
                  Clear boundary
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void saveAoi()}
                  disabled={draftVertices.length < 3}
                >
                  Save AOI
                </button>
                <button type="button" className="button button-secondary" onClick={discardDraft}>
                  Discard
                </button>
              </div>
            </section>
          ) : null}
        </OverlayPanel>
      ) : null}

      {panel === 'request' ? (
        <OverlayPanel title="New analysis request" onClose={() => setPanel(null)} position="right">
          <p className="panel-intro">
            The Gateway prepares a proposal after submission. Confirmation is a separate action.
          </p>
          <label className="field-label" htmlFor="request-product">
            Product
          </label>
          <select
            id="request-product"
            value={requestProductId}
            onChange={(event) => setRequestProductId(event.target.value)}
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
            onChange={(event) => setRequestAoiId(event.target.value)}
          >
            <option value="">Select a saved AOI</option>
            {aois.map((aoi) => (
              <option key={aoi.id} value={aoi.id}>
                {aoi.name}
              </option>
            ))}
          </select>
          <button type="button" className="text-button" onClick={() => beginNewAoi(true)}>
            Create a saved AOI
          </button>
          <label className="field-label" htmlFor="start-month">
            Start month (UTC)
          </label>
          <input
            id="start-month"
            type="month"
            value={startMonth}
            onChange={(event) => setStartMonth(event.target.value)}
          />
          <label className="field-label" htmlFor="end-month">
            End month (UTC)
          </label>
          <input
            id="end-month"
            type="month"
            value={endMonth}
            onChange={(event) => setEndMonth(event.target.value)}
          />
          <button
            type="button"
            className="button button-primary button-wide"
            onClick={() => void submitRequest()}
          >
            Submit request
          </button>
        </OverlayPanel>
      ) : null}

      {panel === 'requests' ? (
        <OverlayPanel title="Analysis requests" onClose={() => setPanel(null)} position="right">
          <p className="panel-intro">
            Request state is retrieved from the Gateway. A completed request is not evidence of
            scientific validation or complete observations.
          </p>
          {isLoading.requests ? <p>Loading requests...</p> : null}
          {!isLoading.requests && requests.length === 0 ? (
            <p>No analysis requests are available.</p>
          ) : null}
          <div className="request-list">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onRefresh={(id) => void refreshRequest(id)}
                onConfirm={(id) => void confirmRequest(id)}
                onCancel={(id) => void cancelRequest(id)}
                onDisplay={(nextRequest) => void displayResult(nextRequest)}
                onDelivery={(nextRequest) => void requestDelivery(nextRequest)}
              />
            ))}
          </div>
        </OverlayPanel>
      ) : null}

      {panel === 'indicators' ? (
        <OverlayPanel title="Indicators" onClose={() => setPanel(null)} position="right">
          <p className="panel-intro">
            Indicators are a later monitoring capability. They are not required to compute or
            explore scientific products.
          </p>
          <p>No indicators are configured.</p>
        </OverlayPanel>
      ) : null}

      {panel === 'account' ? (
        <OverlayPanel title="Account and credits" onClose={() => setPanel(null)} position="right">
          <p className="panel-intro">
            Credit balances are supplied by the Gateway and are shown before confirming a proposal
            when available.
          </p>
          {isLoading.balance ? <p>Loading credit balance...</p> : null}
          {!isLoading.balance && creditBalance ? (
            <p className="credit-value">
              {creditBalance.balance} {creditBalance.unit ?? 'credits'}
            </p>
          ) : null}
          {!isLoading.balance && !creditBalance ? <p>Credit balance is unavailable.</p> : null}
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void refreshBalance()}
          >
            Refresh balance
          </button>
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
          {inspectorOpen ? 'Hide result inspector' : 'Show result inspector'}
        </button>
        {inspectorOpen ? (
          <div className="inspector-content">
            <div>
              <strong>Result representation</strong>
              {displayedRequest?.resultId ? (
                <p>
                  Result {displayedRequest.resultId} from request {displayedRequest.id}
                </p>
              ) : (
                <p>No result representation selected.</p>
              )}
              {resultMap ? (
                <p>Map representation loaded from the Gateway.</p>
              ) : (
                <p>Select “Display on map” for a completed request to load a representation.</p>
              )}
            </div>
            {delivery ? (
              <div className="delivery-status">
                <strong>
                  Delivery <StatusPill state={delivery.state} />
                </strong>
                {delivery.message ? <p>{delivery.message}</p> : null}
                {delivery.state === 'READY' && delivery.downloadUrl ? (
                  <a className="button button-primary" href={delivery.downloadUrl}>
                    Download delivery
                  </a>
                ) : null}
                {delivery.state !== 'READY' ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => void refreshDelivery()}
                  >
                    Refresh delivery
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}
