import type { SeriesPoint } from '../api/client'

type TimeSeriesChartProps = {
  points: SeriesPoint[]
  units: string
  qualityStatus: string
  coverage: number | null
  loading?: boolean
  error?: string | null
  emptyMessage?: string
}

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const PADDING_LEFT = 52
const PADDING_RIGHT = 18
const PADDING_TOP = 18
const PADDING_BOTTOM = 38
const TICK_COUNT = 4

function formatValue(value: number): string {
  if (value === 0) return '0'
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(3)
}

function buildScale(values: number[]): { min: number; max: number } {
  const minimum = Math.min(0, ...values)
  const maximum = Math.max(0, ...values)
  if (minimum === maximum) return { min: minimum - 1, max: maximum + 1 }
  const padding = (maximum - minimum) * 0.08
  return { min: minimum - padding, max: maximum + padding }
}

export function TimeSeriesChart({
  points,
  units,
  qualityStatus,
  coverage,
  loading = false,
  error = null,
  emptyMessage = 'No observation is available for the selected period.',
}: TimeSeriesChartProps) {
  if (loading) {
    return (
      <div className="state-notice" role="status">
        Loading temporal series…
      </div>
    )
  }
  if (error) {
    return (
      <div className="state-notice state-notice-error" role="alert">
        {error}
      </div>
    )
  }
  if (points.length === 0) {
    return <div className="state-notice">{emptyMessage}</div>
  }
  const validPoints = points.filter(
    (point): point is SeriesPoint & { value: number } => point.value !== null,
  )
  if (validPoints.length === 0) {
    return (
      <div className="state-notice">
        No valid observation is available for the selected period. Missing values are not zeros.
      </div>
    )
  }
  const scale = buildScale(validPoints.map((point) => point.value))
  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const x = (index: number): number =>
    PADDING_LEFT + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
  const y = (value: number): number =>
    PADDING_TOP + ((scale.max - value) / (scale.max - scale.min)) * plotHeight
  const segments: Array<Array<{ x: number; y: number }>> = []
  let current: Array<{ x: number; y: number }> = []
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    current.push({ x: x(index), y: y(point.value) })
  })
  if (current.length) segments.push(current)
  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => {
    const value = scale.min + ((scale.max - scale.min) * index) / (TICK_COUNT - 1)
    return { value, y: y(value) }
  })
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  const summary = `${points.length} periods, ${validPoints.length} valid, ${points.length - validPoints.length} missing or masked.`

  return (
    <figure className="series-figure" aria-label="Time series chart">
      <figcaption>
        <strong>{summary}</strong>
        <span>
          Units: {units} · Quality: {qualityStatus}
          {coverage !== null ? ` · Coverage: ${Math.round(coverage * 100)}%` : ''}
        </span>
      </figcaption>
      <svg
        className="series-chart"
        role="img"
        aria-label={`Time series in ${units}`}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      >
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PADDING_LEFT}
              x2={CHART_WIDTH - PADDING_RIGHT}
              y1={tick.y}
              y2={tick.y}
              className="series-grid"
            />
            <text
              x={PADDING_LEFT - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="series-axis-label"
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}
        <line
          x1={PADDING_LEFT}
          x2={CHART_WIDTH - PADDING_RIGHT}
          y1={y(0)}
          y2={y(0)}
          className="series-zero-line"
        />
        {segments.map((segment, index) =>
          segment.length > 1 ? (
            <polyline
              key={`segment-${index}`}
              className="series-line"
              points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
            />
          ) : (
            <circle
              key={`segment-${index}`}
              className="series-point"
              cx={segment[0].x}
              cy={segment[0].y}
              r={3.5}
            />
          ),
        )}
        {validPoints.map((point) => {
          const index = points.indexOf(point)
          return (
            <circle
              key={point.periodStart}
              className={point.value === 0 ? 'series-point series-point-zero' : 'series-point'}
              cx={x(index)}
              cy={y(point.value)}
              r={3.5}
            />
          )
        })}
        {labelIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={CHART_HEIGHT - 12}
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            className="series-axis-label"
          >
            {points[index].periodStart.slice(0, 7)}
          </text>
        ))}
      </svg>
      <table className="series-table">
        <caption>Values and observation states</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Value</th>
            <th scope="col">State</th>
            <th scope="col">Coverage</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.periodStart}>
              <th scope="row">{point.periodStart.slice(0, 7)}</th>
              <td>{point.value === null ? 'No value' : `${formatValue(point.value)} ${units}`}</td>
              <td>{point.state}</td>
              <td>
                {point.coverage === null
                  ? 'Not applicable'
                  : `${Math.round(point.coverage * 100)}%`}
              </td>
              <td>{point.note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
