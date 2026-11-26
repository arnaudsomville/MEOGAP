import { useEffect, useId, useRef } from 'react'
import type { SeriesParameter, SeriesPoint, SeriesResponse } from '../api/client'
import type { Hemisphere, TemporalFilters } from '../temporal'
import { SeriesParameterSelector } from './SeriesParameterSelector'
import { TemporalFilters as TemporalFiltersPanel } from './TemporalFilters'
import { TimeSeriesChart } from './TimeSeriesChart'

type ChartWorkspaceProps = {
  open: boolean
  onClose: () => void
  productName: string
  resultId: string
  resultVersion: string | null
  periodLabel: string
  selectionLabel: string
  series: SeriesResponse
  points: SeriesPoint[]
  availableParameters: SeriesParameter[]
  selectedParameters: string[]
  onToggleParameter: (name: string) => void
  filters: TemporalFilters
  hemisphere: Hemisphere
  onFiltersChange: (filters: TemporalFilters) => void
  onResetFilters: () => void
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function countState(points: SeriesPoint[], state: SeriesPoint['state']): number {
  return points.filter((point) => point.state === state).length
}

export function ChartWorkspace({
  open,
  onClose,
  productName,
  resultId,
  resultVersion,
  periodLabel,
  selectionLabel,
  series,
  points,
  availableParameters,
  selectedParameters,
  onToggleParameter,
  filters,
  hemisphere,
  onFiltersChange,
  onResetFilters,
}: ChartWorkspaceProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const valid = countState(series.points, 'VALID')
  const missing = countState(series.points, 'MISSING')
  const masked = countState(series.points, 'MASKED')
  const invalid = countState(series.points, 'INVALID')
  const displayedParameters = availableParameters.filter((parameter) =>
    selectedParameters.includes(parameter.name),
  )
  return (
    <div
      className="chart-workspace-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="chart-workspace"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="chart-workspace-header">
          <div>
            <span className="eyebrow">Temporal exploration</span>
            <h2 id={titleId}>{productName} time series</h2>
            <p>
              Result <strong>{resultId}</strong>
              {resultVersion ? ` · version ${resultVersion}` : ''} · {periodLabel}
            </p>
            <p className="chart-workspace-context">{selectionLabel}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button chart-workspace-close"
            onClick={onClose}
            aria-label="Close chart workspace"
            title="Close chart workspace"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="chart-workspace-body">
          <section className="chart-summary" aria-label="Series summary">
            <span>{`Showing ${points.length} of ${series.points.length} period values`}</span>
            <span>Valid: {valid}</span>
            <span>Missing: {missing}</span>
            <span>Masked: {masked}</span>
            {invalid ? <span>Invalid: {invalid}</span> : null}
            <span>Units: {series.units}</span>
            <span>Quality: {series.qualityStatus}</span>
            <span>Provenance: {series.provenance ?? 'Unavailable'}</span>
          </section>

          <div className="chart-workspace-grid">
            <div className="chart-workspace-chart">
              <SeriesParameterSelector
                parameters={availableParameters}
                selected={selectedParameters}
                onToggle={onToggleParameter}
              />
              {displayedParameters.length === 0 ? (
                <div className="state-notice">
                  Select at least one available parameter to display its time series.
                </div>
              ) : (
                displayedParameters.map((parameter) => {
                  const parameterPoints = points.filter(
                    (point) => point.parameter === parameter.name,
                  )
                  return (
                    <section key={parameter.name} aria-label={`${parameter.label} series`}>
                      <h3>{parameter.label}</h3>
                      <TimeSeriesChart
                        points={parameterPoints}
                        units={parameter.units}
                        qualityStatus={series.qualityStatus}
                        coverage={series.coverage}
                        emptyMessage="No observation matches the selected temporal display filters."
                      />
                    </section>
                  )
                })
              )}
              <p className="muted">
                {series.note} Aggregation: {series.aggregationMethod}. {series.qualityNote} Missing
                periods remain gaps, never zero values.
              </p>
            </div>
            <TemporalFiltersPanel
              points={series.points}
              filters={filters}
              hemisphere={hemisphere}
              onChange={onFiltersChange}
              onReset={onResetFilters}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
