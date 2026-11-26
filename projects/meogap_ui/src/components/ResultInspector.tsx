import type { AnalysisRequest, ResultDetail, ResultMap } from '../api/client'
import { SELECTION_CRS, temporalFrequencyLabel } from '../app/constants'
import { Icon } from './Icon'
import { StateNotice } from './StateNotice'

type ResultInspectorProps = {
  inspectorOpen: boolean
  setInspectorOpen: (open: boolean) => void
  displayedRequest: AnalysisRequest | null
  resultMap: ResultMap | null
  resultDetail: ResultDetail | null
  resultVisible: boolean
  onToggleResultVisible: () => void
  resultFrameIndex: number
  setResultFrameIndex: (index: number) => void
  resultFrames: ResultMap['frames']
  selectedFrame: ResultMap['frames'][number] | null
  selectionMode: 'none' | 'point' | 'polygon'
  selectionPoint: { lat: number; lng: number } | null
  selectionVertices: { lat: number; lng: number }[]
  selectionReuse: unknown
  selectionSource: 'request_aoi' | 'result_geometry' | null
  activeSelectionWkt: string | null
  hasSelection: boolean
  seriesLoading: boolean
  seriesError: string | null
  seriesLoaded: boolean
  onStartPoint: () => void
  onStartPolygon: () => void
  onReuseRequestAoi: () => void
  onUseResultGeometry: () => void
  onClearSelection: () => void
  onUndoSelectionVertex: () => void
  onOpenTimeSeries: () => void
  onLoadSeries: () => void
  pointToWkt: (point: { lat: number; lng: number }) => string
}

export function ResultInspector({
  inspectorOpen,
  setInspectorOpen,
  displayedRequest,
  resultMap,
  resultDetail,
  resultVisible,
  onToggleResultVisible,
  resultFrameIndex,
  setResultFrameIndex,
  resultFrames,
  selectedFrame,
  selectionMode,
  selectionPoint,
  selectionVertices,
  selectionReuse,
  selectionSource,
  activeSelectionWkt,
  hasSelection,
  seriesLoading,
  seriesError,
  seriesLoaded,
  onStartPoint,
  onStartPolygon,
  onReuseRequestAoi,
  onUseResultGeometry,
  onClearSelection,
  onUndoSelectionVertex,
  onOpenTimeSeries,
  onLoadSeries,
  pointToWkt,
}: ResultInspectorProps) {
  return (
    <section
      className={inspectorOpen ? 'bottom-inspector inspector-open' : 'bottom-inspector'}
      aria-label="Result inspector"
    >
      <button
        type="button"
        className="inspector-toggle"
        onClick={() => setInspectorOpen(!inspectorOpen)}
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
                      displayedRequest.temporalFrequency ?? resultDetail?.temporalFrequency ?? null,
                    )}
                  </dd>
                  <dt>Units</dt>
                  <dd>{resultDetail?.units ?? resultMap?.units ?? 'Unavailable'}</dd>
                  <dt>Provenance</dt>
                  <dd>{resultDetail?.provenance ?? resultMap?.provenance ?? 'Unavailable'}</dd>
                  <dt>Quality</dt>
                  <dd>
                    {resultDetail?.qualityStatus ?? resultMap?.qualityStatus ?? 'Unavailable'}
                  </dd>
                  <dt>Scientific validation</dt>
                  <dd>
                    {resultDetail?.validationStatus ?? resultMap?.validationStatus ?? 'Unavailable'}
                  </dd>
                  <dt>Provenance note</dt>
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
                  onClick={onToggleResultVisible}
                  aria-pressed={resultVisible}
                >
                  <Icon name="layers" />
                  {resultVisible ? 'Hide result layer' : 'Show result layer'}
                </button>
              </div>
            ) : (
              <p>Select “Display on map” for a succeeded request to load a representation.</p>
            )}
            {resultFrames.length ? (
              <div className="result-frames">
                <label className="field-label" htmlFor="result-frame">
                  Displayed frame
                </label>
                <input
                  id="result-frame"
                  type="range"
                  min={0}
                  max={resultFrames.length - 1}
                  step={1}
                  value={Math.min(resultFrameIndex, resultFrames.length - 1)}
                  onChange={(event) => setResultFrameIndex(Number(event.target.value))}
                />
                <p>
                  Frame {Math.min(resultFrameIndex + 1, resultFrames.length)} of{' '}
                  {resultFrames.length} · {selectedFrame?.periodStart} → {selectedFrame?.periodEnd}
                </p>
                <p className="muted">
                  Mock request-period date. Visual reused from the synthetic demonstration raster
                  for {selectedFrame?.visualPeriodStart} → {selectedFrame?.visualPeriodEnd}.
                </p>
              </div>
            ) : null}
            <p className="muted">
              Result layers are synthetic/demo representations, distinct from the satellite basemap
              and from scientifically validated products.
            </p>
          </div>

          {resultMap ? (
            <section className="inspector-selection" aria-label="Spatial selection">
              <h3>Explore this result</h3>
              <p className="field-help">
                Selection is independent from the request geometry. Coordinates are sent as WKT with
                an explicit {SELECTION_CRS} CRS.
              </p>
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  aria-pressed={selectionMode === 'point'}
                  onClick={onStartPoint}
                >
                  <Icon name="map-pin" />
                  Select point
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  aria-pressed={selectionMode === 'polygon'}
                  onClick={onStartPolygon}
                >
                  <Icon name="pencil" />
                  Draw polygon
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onReuseRequestAoi}
                  disabled={
                    !displayedRequest?.geometrySnapshot ||
                    displayedRequest.geometrySnapshot.type !== 'Polygon'
                  }
                  title="M0 sends a single polygon WKT selection"
                >
                  <Icon name="layers" />
                  Use request AOI
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onUseResultGeometry}
                  disabled={!resultDetail?.geometry || resultDetail.geometry.type !== 'Polygon'}
                  title="M0 sends a single polygon WKT selection"
                >
                  <Icon name="image" />
                  Use result geometry
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onClearSelection}
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
                  Point selection: {pointToWkt(selectionPoint)} ({SELECTION_CRS})
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
                      onClick={onUndoSelectionVertex}
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
                onClick={onOpenTimeSeries}
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
          {!seriesLoading && !seriesError && seriesLoaded ? (
            <p className="field-help">
              Time series loaded. Open the chart workspace to explore parameters and display filters
              without submitting a new request.
              <button type="button" className="text-button" onClick={onLoadSeries}>
                Reload series
              </button>
            </p>
          ) : null}
          {!seriesLoading && !seriesError && !seriesLoaded && resultMap ? (
            <StateNotice icon="activity">
              Select a point, draw a polygon, or reuse a geometry, then open its time series. A
              period without observation will remain a gap, never a zero.
            </StateNotice>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
