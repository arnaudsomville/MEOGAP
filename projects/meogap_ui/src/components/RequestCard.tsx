import type { AnalysisRequest, Delivery, DeliveryKind } from '../api/client'
import { temporalFrequencyLabel } from '../app/constants'
import { Icon } from './Icon'
import { StatusPill } from './StatusPill'

type RequestCardProps = {
  request: AnalysisRequest
  productName: string | null
  aoiName: string | null
  onRefresh: (id: string) => void
  onCancel: (id: string) => void
  onDisplay: (request: AnalysisRequest) => void
  onDelivery: (request: AnalysisRequest, kind: DeliveryKind) => void
  delivery: Delivery | null
  onRefreshDelivery: (requestId: string, deliveryId: string) => void
}

const NON_CANCELLABLE_STATES = new Set(['succeeded', 'failed', 'cancelled'])

export function RequestCard({
  request,
  productName,
  aoiName,
  onRefresh,
  onCancel,
  onDisplay,
  onDelivery,
  delivery,
  onRefreshDelivery,
}: RequestCardProps) {
  const canCancel = !NON_CANCELLABLE_STATES.has(request.state)
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
      {request.state === 'failed' ? (
        <p className="failure-text">
          Failed{request.failureStage ? ` during ${request.failureStage.replaceAll('_', ' ')}` : ''}
          .
        </p>
      ) : null}
      {request.state === 'queued' ? (
        <p>Request queued. The Gateway will move it to processing automatically.</p>
      ) : null}
      {request.state === 'processing' ? (
        <p>Synthetic demo processing is in progress. Result availability is not yet guaranteed.</p>
      ) : null}
      {request.state === 'succeeded' && !hasResult ? (
        <p>Succeeded, but no result identifier was provided for map or delivery access.</p>
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
        {request.state === 'succeeded' ? (
          <>
            <button
              type="button"
              className="button button-primary"
              disabled={!hasResult}
              onClick={() => onDisplay(request)}
            >
              Display on map
            </button>
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
