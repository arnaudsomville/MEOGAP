import type {
  Aoi,
  CostEstimate,
  Product,
  SourceMissionInfo,
  TemporalFrequency,
} from '../../api/client'
import { TEMPORAL_FREQUENCY_LABELS } from '../../app/constants'
import { Icon } from '../Icon'
import { OverlayPanel } from '../OverlayPanel'
import { StateNotice } from '../StateNotice'

type RequestPanelProps = {
  onClose: () => void
  products: Product[]
  aois: Aoi[]
  requestProductId: string
  onChangeProduct: (id: string) => void
  requestAoiId: string
  onSelectAoi: (id: string) => void
  onBeginNewAoi: () => void
  startMonth: string
  setStartMonth: (value: string) => void
  endMonth: string
  setEndMonth: (value: string) => void
  requestFrequency: TemporalFrequency | ''
  setRequestFrequency: (value: TemporalFrequency | '') => void
  requestFrequencyOptions: TemporalFrequency[]
  requestProduct: Product | null
  missionsLoading: boolean
  missionsError: string | null
  missions: SourceMissionInfo[]
  requestSources: string[]
  allMissionsSelected: boolean
  onToggleSource: (source: string) => void
  onSelectAllSources: () => void
  requestResolution: string
  setRequestResolution: (value: string) => void
  estimate: CostEstimate | null
  estimating: boolean
  estimateError: string | null
  admissionLabel: string | null
  canSubmit: boolean
  onSubmit: () => void
  onClearEstimate: () => void
}

function nativeResolutionNote(product: Product | null): string {
  return product?.nativeResolution
    ? `Declared native resolution: ${product.nativeResolution}. A request cannot reveal detail finer than the source data.`
    : 'Selecting a pixel size cannot reveal detail finer than the source data.'
}

export function RequestPanel({
  onClose,
  products,
  aois,
  requestProductId,
  onChangeProduct,
  requestAoiId,
  onSelectAoi,
  onBeginNewAoi,
  startMonth,
  setStartMonth,
  endMonth,
  setEndMonth,
  requestFrequency,
  setRequestFrequency,
  requestFrequencyOptions,
  requestProduct,
  missionsLoading,
  missionsError,
  missions,
  requestSources,
  allMissionsSelected,
  onToggleSource,
  onSelectAllSources,
  requestResolution,
  setRequestResolution,
  estimate,
  estimating,
  estimateError,
  admissionLabel,
  canSubmit,
  onSubmit,
  onClearEstimate,
}: RequestPanelProps) {
  return (
    <OverlayPanel title="New analysis request" icon={<Icon name="plus" />} onClose={onClose}>
      <p className="panel-intro">
        Configure the constraints, then submit. The Gateway queues the request immediately and runs
        the deterministic M0 lifecycle without a manual confirmation step.
      </p>
      <label className="field-label" htmlFor="request-product">
        Product
      </label>
      <select
        id="request-product"
        value={requestProductId}
        onChange={(event) => onChangeProduct(event.target.value)}
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
        onChange={(event) => onSelectAoi(event.target.value)}
      >
        <option value="">Select a saved AOI</option>
        {aois.map((aoi) => (
          <option key={aoi.id} value={aoi.id}>
            {aoi.name}
          </option>
        ))}
      </select>
      <div className="request-aoi-picker" aria-label="Select a saved AOI">
        {aois.map((aoi) => (
          <button
            key={aoi.id}
            type="button"
            className={
              aoi.id === requestAoiId
                ? 'request-aoi-option request-aoi-option-selected'
                : 'request-aoi-option'
            }
            onClick={() => onSelectAoi(aoi.id)}
          >
            <Icon name="map-pin" size={14} />
            <span>{aoi.name}</span>
          </button>
        ))}
      </div>
      <button type="button" className="text-button" onClick={onBeginNewAoi}>
        <Icon name="plus" />
        Create a saved AOI
      </button>
      <p className="field-help">
        M0 request inputs are AOIs only. Point and polygon selections are available when exploring a
        result. Selecting an AOI zooms the map to its extent.
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
              onClearEstimate()
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
              onClearEstimate()
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
            onClearEstimate()
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
          <p className="field-help">Select a product to load its declared temporal frequencies.</p>
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
              onClick={onSelectAllSources}
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
                  onChange={() => onToggleSource(mission.id)}
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
              onClearEstimate()
            }}
          >
            <option value="">No maximum (use native resolution)</option>
            {requestProduct.supportedResolutionsM.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution} m
              </option>
            ))}
          </select>
          <p className="field-help">{nativeResolutionNote(requestProduct)}</p>
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
            {' · '}Selections:{' '}
            {requestProduct.supportedSelectionGeometries.length
              ? requestProduct.supportedSelectionGeometries.join(', ')
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
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          <Icon name="check" />
          Submit request
        </button>
      </div>
    </OverlayPanel>
  )
}
