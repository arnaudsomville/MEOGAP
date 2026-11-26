import type { AnalysisRequest, Delivery, DeliveryKind } from '../../api/client'
import { Icon } from '../Icon'
import { OverlayPanel } from '../OverlayPanel'
import { RequestCard } from '../RequestCard'
import { StateNotice } from '../StateNotice'

type RequestsPanelProps = {
  onClose: () => void
  requests: AnalysisRequest[]
  productName: (id: string | null) => string | null
  aoiName: (id: string | null) => string | null
  hasActiveRequests: boolean
  loading: boolean
  loadError: boolean
  onRetry: () => void
  onRefreshRequest: (id: string) => void
  onCancelRequest: (id: string) => void
  onDisplay: (request: AnalysisRequest) => void
  onDelivery: (request: AnalysisRequest, kind: DeliveryKind) => void
  deliveries: Record<string, Delivery>
  onRefreshDelivery: (requestId: string, deliveryId: string) => void
  onNewRequest: () => void
}

export function RequestsPanel({
  onClose,
  requests,
  productName,
  aoiName,
  hasActiveRequests,
  loading,
  loadError,
  onRetry,
  onRefreshRequest,
  onCancelRequest,
  onDisplay,
  onDelivery,
  deliveries,
  onRefreshDelivery,
  onNewRequest,
}: RequestsPanelProps) {
  return (
    <OverlayPanel title="Analysis requests" icon={<Icon name="clipboard" />} onClose={onClose}>
      <div className="panel-toolbar">
        <p className="panel-intro">
          Request state is retrieved from REST. A successful request does not imply scientific
          validation or complete observations.
        </p>
        <div className="inline-actions">
          <button type="button" className="button button-secondary" onClick={onRetry}>
            <Icon name="refresh" />
            Refresh requests
          </button>
          <button type="button" className="button button-primary" onClick={onNewRequest}>
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
      {loading ? <StateNotice icon="refresh">Loading requests…</StateNotice> : null}
      {!loading && loadError ? (
        <StateNotice icon="alert" tone="error">
          <p>Requests are unavailable.</p>
          <button type="button" className="button button-secondary" onClick={onRetry}>
            Retry
          </button>
        </StateNotice>
      ) : null}
      {!loading && !loadError && requests.length === 0 ? (
        <StateNotice icon="clipboard">No analysis requests are available.</StateNotice>
      ) : null}
      <div className="request-list">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            productName={productName(request.productId)}
            aoiName={aoiName(request.aoiId)}
            onRefresh={onRefreshRequest}
            onCancel={onCancelRequest}
            onDisplay={onDisplay}
            onDelivery={onDelivery}
            delivery={deliveries[request.id] ?? null}
            onRefreshDelivery={onRefreshDelivery}
          />
        ))}
      </div>
    </OverlayPanel>
  )
}
