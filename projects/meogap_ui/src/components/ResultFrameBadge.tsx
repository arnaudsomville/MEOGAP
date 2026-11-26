import type { ResultMapFrame } from '../api/client'

type ResultFrameBadgeProps = {
  productName: string
  frame: ResultMapFrame | null
  provenance: string | null
}

export function ResultFrameBadge({ productName, frame, provenance }: ResultFrameBadgeProps) {
  if (!frame) return null
  return (
    <div className="result-frame-badge" role="status" aria-live="polite">
      <span className="result-frame-badge-product">{productName}</span>
      <strong>
        {frame.periodStart} → {frame.periodEnd}
      </strong>
      <span className="result-frame-badge-meta">
        {provenance ?? 'SYNTHETIC_DEMO'} · date shown is the mock display period
      </span>
    </div>
  )
}
