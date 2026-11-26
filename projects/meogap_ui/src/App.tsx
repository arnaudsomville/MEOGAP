import { useRef, useState } from 'react'
import {
  cancelAnalysisRequest,
  getAnalysisRequest,
  getProduct,
  getProductRequirements,
  type Position,
  type Product,
  type ProductRequirements,
} from './api/client'
import {
  DEFAULT_POLL_INTERVAL_MS,
  INSPECTOR_COLLAPSED_RESERVE_PX,
  INSPECTOR_EXPANDED_RESERVE_PX,
  MAP_TOOL_RESERVE_PX,
  NARROW_LAYOUT_MAX_WIDTH_PX,
  PANEL_RESERVE_PX,
  TOP_RESERVE_PX,
  type AppProps,
  type Panel,
} from './app/constants'
import { useAoiWorkflow } from './app/useAoiWorkflow'
import { useRequestComposer } from './app/useRequestComposer'
import { useResultExplorer } from './app/useResultExplorer'
import { useSearch } from './app/useSearch'
import { useWorkspaceData } from './app/useWorkspaceData'
import { ChartWorkspace } from './components/ChartWorkspace'
import { Icon } from './components/Icon'
import { LeafletMapSurface } from './map/LeafletMapSurface'
import {
  geometryBounds,
  positionToWktPoint,
  type MapBounds,
  type MapFocus,
} from './map/coordinates'
import { AccountPanel } from './components/panels/AccountPanel'
import { AoiPanel } from './components/panels/AoiPanel'
import { CataloguePanel } from './components/panels/CataloguePanel'
import { IndicatorsPanel } from './components/panels/IndicatorsPanel'
import { RequestPanel } from './components/panels/RequestPanel'
import { RequestsPanel } from './components/panels/RequestsPanel'
import { ResultFrameBadge } from './components/ResultFrameBadge'
import { ResultInspector } from './components/ResultInspector'
import { WorkspaceHeader } from './components/WorkspaceHeader'

export default function App({
  MapSurface = LeafletMapSurface,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: AppProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [sessionActive, setSessionActive] = useState(true)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [focusRevision, setFocusRevision] = useState(0)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)

  const workspace = useWorkspaceData({ sessionActive, pollIntervalMs })
  const {
    products,
    aois,
    requests,
    creditBalance,
    account,
    isDemo,
    error,
    isLoading,
    loadErrors,
    receive,
    showError,
    setError,
    setProducts,
    setAois,
    setRequests,
    setAccount,
    setCreditBalance,
    loadCatalogue,
    loadAois,
    loadRequests,
    refreshBalance,
    upsertRequest,
  } = workspace

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [requirements, setRequirements] = useState<ProductRequirements | null>(null)

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

  const composer = useRequestComposer({
    products,
    sessionActive,
    panel,
    receive,
    showError,
    setError,
    setPanel: (next) => setPanel(next),
    upsertRequest,
    focusAoi: (aoiId: string) => {
      const aoi = aois.find((item) => item.id === aoiId)
      const bounds = aoi ? geometryBounds(aoi.geometry) : null
      if (bounds) focusBounds(bounds, { reserveRightPanel: true })
    },
  })

  const aoiWorkflow = useAoiWorkflow({
    aois,
    setAois,
    receive,
    showError,
    setError,
    focusBounds,
    onResumeRequest: (aoiId: string) => {
      composer.selectRequestAoi(aoiId)
      setPanel('request')
    },
    openAoiPanel: () => setPanel('aois'),
  })

  const explorer = useResultExplorer({ receive, showError, setError, focusBounds })

  const search = useSearch({
    aois,
    applyFocus,
    selectAoi: aoiWorkflow.selectAoi,
    openAoisPanel: () => setPanel('aois'),
  })

  async function selectProduct(id: string): Promise<void> {
    setSelectedProductId(id)
    setSelectedProduct(null)
    setRequirements(null)
    try {
      const [productResult, requirementsResult] = await Promise.all([
        getProduct(id),
        getProductRequirements(id),
      ])
      setSelectedProduct(receive(productResult))
      setRequirements(receive(requirementsResult))
      await composer.loadMissions(id)
    } catch (reason) {
      showError('Product details could not be loaded', reason)
    }
  }

  async function refreshRequest(id: string): Promise<void> {
    try {
      upsertRequest(receive(await getAnalysisRequest(id)))
    } catch (reason) {
      showError('Request status could not be refreshed', reason)
    }
  }

  async function cancelRequest(id: string): Promise<void> {
    try {
      upsertRequest(receive(await cancelAnalysisRequest(id)))
    } catch (reason) {
      showError('Request could not be cancelled', reason)
    }
  }

  async function displayResult(
    request: Parameters<typeof explorer.displayResult>[0],
  ): Promise<void> {
    await explorer.displayResult(request)
    setInspectorOpen(true)
  }

  function openAccount(): void {
    setAccountOpen(false)
    search.setSearchOpen(false)
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
    explorer.reset()
  }

  function signIn(): void {
    setSessionActive(true)
    setPanel(null)
  }

  function togglePanel(nextPanel: Exclude<Panel, null>): void {
    setPanel((current) => (current === nextPanel ? null : nextPanel))
    setAccountOpen(false)
  }

  const hasActiveRequests = requests.some(
    (request) => !['succeeded', 'failed', 'cancelled'].includes(request.state),
  )
  const activeRequestCount = requests.filter(
    (request) => !['succeeded', 'failed', 'cancelled'].includes(request.state),
  ).length
  const creditSummary =
    isLoading.balance && !creditBalance
      ? 'Loading credits'
      : creditBalance
        ? `${creditBalance.balance} ${creditBalance.unit ?? 'credits'}`
        : 'Unavailable'
  const displayedProductName = (id: string | null): string | null =>
    products.find((product) => product.id === id)?.name ?? null
  const displayedAoiName = (id: string | null): string | null =>
    aois.find((aoi) => aoi.id === id)?.name ?? null

  return (
    <main className={panel ? 'workspace panel-open' : 'workspace'}>
      <MapSurface
        aois={aois}
        draftVertices={aoiWorkflow.draftVertices}
        drawing={aoiWorkflow.drawing}
        focus={focus}
        focusRevision={focusRevision}
        resultMap={explorer.resultMap}
        resultFrameIndex={explorer.resultFrameIndex}
        resultVisible={explorer.resultVisible}
        selectionMode={explorer.selectionMode}
        selectionPoint={explorer.selectionPoint}
        selectionVertices={explorer.selectionVertices}
        selectedAoiId={aoiWorkflow.selectedAoiId}
        onMapClick={(position: Position) =>
          aoiWorkflow.setDraftVertices((vertices) =>
            aoiWorkflow.drawing ? [...vertices, position] : vertices,
          )
        }
        onResultClick={explorer.handleResultClick}
        onAoiSelect={(id) => void aoiWorkflow.selectAoi(id)}
      />

      {explorer.resultVisible && explorer.selectedResultFrame ? (
        <ResultFrameBadge
          productName={explorer.resultProductName}
          frame={explorer.selectedResultFrame}
          provenance={explorer.resultMap?.provenance ?? null}
        />
      ) : null}

      <WorkspaceHeader
        panel={panel}
        activeRequestCount={activeRequestCount}
        togglePanel={togglePanel}
        searchQuery={search.searchQuery}
        searchOpen={search.searchOpen}
        suggestions={search.suggestions}
        placesLoading={search.placesLoading}
        placesFallback={search.placesFallback}
        highlightedSuggestion={search.highlightedSuggestion}
        searchInputRef={search.searchInputRef}
        searchContainerRef={search.searchContainerRef}
        submitSearch={search.submitSearch}
        changeSearch={search.changeSearch}
        handleSearchKeyDown={search.handleSearchKeyDown}
        clearSearch={search.clearSearch}
        chooseSuggestion={search.chooseSuggestion}
        setSearchOpen={search.setSearchOpen}
        creditSummary={creditSummary}
        account={account}
        sessionActive={sessionActive}
        accountOpen={accountOpen}
        accountMenuRef={accountMenuRef}
        accountButtonRef={accountButtonRef}
        onToggleAccount={() => {
          search.setSearchOpen(false)
          setAccountOpen((open) => !open)
        }}
        onOpenAccount={openAccount}
        onRefreshBalance={() => void refreshBalance()}
      />

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
          onClick={() => aoiWorkflow.beginNewAoi()}
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
        <CataloguePanel
          onClose={() => setPanel(null)}
          products={products}
          selectedProductId={selectedProductId}
          selectedProduct={selectedProduct}
          requirements={requirements}
          loading={isLoading.catalogue}
          loadError={loadErrors.catalogue}
          onRetry={() => void loadCatalogue()}
          onSelectProduct={(id) => void selectProduct(id)}
          onOpenRequest={(productId) => composer.openRequest(productId)}
          missionsProductId={composer.missionsProductId}
          missions={composer.missions}
          missionsLoading={composer.missionsLoading}
          missionsError={composer.missionsError}
        />
      ) : null}

      {panel === 'aois' ? (
        <AoiPanel
          onClose={() => setPanel(null)}
          loading={isLoading.aois}
          loadError={loadErrors.aois}
          onRetry={() => void loadAois()}
          visibleAois={aoiWorkflow.visibleAois}
          selectedAoiId={aoiWorkflow.selectedAoiId}
          selectedAoi={aoiWorkflow.selectedAoi}
          onSelectAoi={(id) => void aoiWorkflow.selectAoi(id)}
          onBeginNew={() => aoiWorkflow.beginNewAoi()}
          onBeginEdit={aoiWorkflow.beginEditAoi}
          aoiQuery={aoiWorkflow.aoiQuery}
          setAoiQuery={aoiWorkflow.setAoiQuery}
          drawing={aoiWorkflow.drawing}
          editingAoiId={aoiWorkflow.editingAoiId}
          aoiName={aoiWorkflow.aoiName}
          setAoiName={aoiWorkflow.setAoiName}
          aoiDescription={aoiWorkflow.aoiDescription}
          setAoiDescription={aoiWorkflow.setAoiDescription}
          draftVerticesCount={aoiWorkflow.draftVertices.length}
          draftAreaKm2={aoiWorkflow.draftAreaKm2}
          draftAreaExceeded={aoiWorkflow.draftAreaExceeded}
          onUndoPoint={() => aoiWorkflow.setDraftVertices((vertices) => vertices.slice(0, -1))}
          onResetDrawing={aoiWorkflow.resetDraftBoundary}
          onSave={() => void aoiWorkflow.saveAoi()}
          onDiscard={aoiWorkflow.discardDraft}
          deleteCandidateId={aoiWorkflow.deleteCandidateId}
          setDeleteCandidateId={aoiWorkflow.setDeleteCandidateId}
          onRemove={(id) => void aoiWorkflow.removeAoi(id)}
          drawingFormRef={aoiWorkflow.drawingFormRef}
        />
      ) : null}

      {panel === 'request' ? (
        <RequestPanel
          onClose={() => setPanel(null)}
          products={products}
          aois={aois}
          requestProductId={composer.requestProductId}
          onChangeProduct={composer.changeRequestProduct}
          requestAoiId={composer.requestAoiId}
          onSelectAoi={composer.selectRequestAoi}
          onBeginNewAoi={() => aoiWorkflow.beginNewAoi(true)}
          startMonth={composer.startMonth}
          setStartMonth={composer.setStartMonth}
          endMonth={composer.endMonth}
          setEndMonth={composer.setEndMonth}
          requestFrequency={composer.requestFrequency}
          setRequestFrequency={composer.setRequestFrequency}
          requestFrequencyOptions={composer.requestFrequencyOptions}
          requestProduct={composer.requestProduct}
          missionsLoading={composer.missionsLoading}
          missionsError={composer.missionsError}
          missions={composer.missions}
          requestSources={composer.requestSources}
          allMissionsSelected={composer.allMissionsSelected}
          onToggleSource={composer.toggleRequestSource}
          onSelectAllSources={composer.selectAllRequestSources}
          requestResolution={composer.requestResolution}
          setRequestResolution={composer.setRequestResolution}
          estimate={composer.estimate}
          estimating={composer.estimating}
          estimateError={composer.estimateError}
          admissionLabel={composer.admissionLabel}
          canSubmit={composer.canSubmit}
          onSubmit={() => void composer.submitRequest()}
          onClearEstimate={composer.clearEstimate}
        />
      ) : null}

      {panel === 'requests' ? (
        <RequestsPanel
          onClose={() => setPanel(null)}
          requests={requests}
          productName={displayedProductName}
          aoiName={displayedAoiName}
          hasActiveRequests={hasActiveRequests}
          loading={isLoading.requests}
          loadError={loadErrors.requests}
          onRetry={() => void loadRequests()}
          onRefreshRequest={(id) => void refreshRequest(id)}
          onCancelRequest={(id) => void cancelRequest(id)}
          onDisplay={(request) => void displayResult(request)}
          onDelivery={(request, kind) => void explorer.requestDelivery(request, kind)}
          deliveries={explorer.deliveries}
          onRefreshDelivery={(requestId, deliveryId) =>
            void explorer.refreshDelivery(requestId, deliveryId)
          }
          onNewRequest={() => composer.openRequest(selectedProductId ?? '')}
        />
      ) : null}

      {panel === 'indicators' ? <IndicatorsPanel onClose={() => setPanel(null)} /> : null}

      {panel === 'account' ? (
        <AccountPanel
          onClose={() => setPanel(null)}
          sessionActive={sessionActive}
          account={account}
          creditBalance={creditBalance}
          loadingBalance={isLoading.balance}
          onSignIn={signIn}
          onSignOut={signOut}
          onRefreshBalance={() => void refreshBalance()}
        />
      ) : null}

      <ResultInspector
        inspectorOpen={inspectorOpen}
        setInspectorOpen={setInspectorOpen}
        displayedRequest={explorer.displayedRequest}
        resultMap={explorer.resultMap}
        resultDetail={explorer.resultDetail}
        resultVisible={explorer.resultVisible}
        onToggleResultVisible={() => explorer.setResultVisible(!explorer.resultVisible)}
        resultFrameIndex={explorer.resultFrameIndex}
        setResultFrameIndex={explorer.setResultFrameIndex}
        resultFrames={explorer.resultFrames}
        selectedFrame={explorer.selectedResultFrame}
        selectionMode={explorer.selectionMode}
        selectionPoint={explorer.selectionPoint}
        selectionVertices={explorer.selectionVertices}
        selectionReuse={explorer.selectionReuse}
        selectionSource={explorer.selectionSource}
        activeSelectionWkt={explorer.activeSelectionWkt}
        hasSelection={explorer.hasSelection}
        seriesLoading={explorer.seriesLoading}
        seriesError={explorer.seriesError}
        seriesLoaded={explorer.series !== null}
        onStartPoint={explorer.startPointSelection}
        onStartPolygon={explorer.startPolygonSelection}
        onReuseRequestAoi={explorer.reuseRequestAoi}
        onUseResultGeometry={explorer.useResultGeometry}
        onClearSelection={explorer.clearSelection}
        onUndoSelectionVertex={explorer.undoSelectionVertex}
        onOpenTimeSeries={() => void explorer.openTimeSeries()}
        onLoadSeries={() => void explorer.loadSeries(false)}
        pointToWkt={positionToWktPoint}
      />

      {explorer.chartOpen && explorer.series && explorer.displayedRequest?.resultId ? (
        <ChartWorkspace
          open={explorer.chartOpen}
          onClose={() => explorer.setChartOpen(false)}
          productName={explorer.resultProductName}
          resultId={explorer.displayedRequest.resultId}
          resultVersion={
            explorer.resultDetail?.resultVersion ?? explorer.resultMap?.resultVersion ?? null
          }
          periodLabel={explorer.resultPeriodLabel}
          selectionLabel={explorer.selectionLabel}
          series={explorer.series}
          points={explorer.filteredSeriesPoints}
          availableParameters={explorer.availableParameters}
          selectedParameters={explorer.selectedParameters}
          onToggleParameter={explorer.toggleParameter}
          filters={explorer.temporalFilters}
          hemisphere={explorer.seriesHemisphere}
          onFiltersChange={explorer.setTemporalFilters}
          onResetFilters={explorer.resetFilters}
        />
      ) : null}
    </main>
  )
}
