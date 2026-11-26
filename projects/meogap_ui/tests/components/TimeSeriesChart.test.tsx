import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SeriesPoint } from '../../src/api/client'
import { TimeSeriesChart } from '../../src/components/TimeSeriesChart'

function point(
  periodStart: string,
  value: number | null,
  state: SeriesPoint['state'] = value === null ? 'MISSING' : 'VALID',
): SeriesPoint {
  return {
    parameter: 'ndvi',
    periodStart,
    periodEnd: periodStart,
    value,
    unit: 'unitless',
    state,
    qualityStatus: state === 'VALID' ? 'VALID' : 'UNKNOWN',
    coverage: null,
    note: state === 'MISSING' ? 'No observation.' : null,
  }
}

const MIXED_POINTS = [
  point('2026-01-01', 0),
  point('2026-02-01', 0.4),
  point('2026-03-01', null),
  point('2026-04-01', null, 'MASKED'),
  point('2026-05-01', 0.8),
]

describe('TimeSeriesChart', () => {
  it('renders loading and error states distinctly', { tags: ['unit'] }, () => {
    const loading = render(
      <TimeSeriesChart
        points={[]}
        units="unitless"
        qualityStatus="UNKNOWN"
        coverage={null}
        loading
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading temporal series')
    loading.unmount()
    render(
      <TimeSeriesChart
        points={[]}
        units="unitless"
        qualityStatus="UNKNOWN"
        coverage={null}
        error="Gateway unavailable"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Gateway unavailable')
  })

  it('renders empty and fully invalid series without inventing zeros', { tags: ['unit'] }, () => {
    const empty = render(
      <TimeSeriesChart points={[]} units="unitless" qualityStatus="UNKNOWN" coverage={null} />,
    )
    expect(screen.getByText(/No observation is available/)).toBeInTheDocument()
    empty.unmount()
    render(
      <TimeSeriesChart
        points={[point('2026-01-01', null), point('2026-02-01', null, 'MASKED')]}
        units="unitless"
        qualityStatus="PARTIAL"
        coverage={null}
      />,
    )
    expect(screen.getByText(/No valid observation is available/)).toBeInTheDocument()
    expect(screen.queryByText('0 unitless')).not.toBeInTheDocument()
  })

  it('keeps a measured zero distinct from missing and masked periods', { tags: ['unit'] }, () => {
    render(
      <TimeSeriesChart
        points={MIXED_POINTS}
        units="unitless"
        qualityStatus="PARTIAL"
        coverage={0.72}
      />,
    )
    expect(screen.getByRole('img', { name: 'Time series in unitless' })).toBeInTheDocument()
    expect(screen.getByText('0 unitless')).toBeInTheDocument()
    expect(screen.getAllByText('No value')).toHaveLength(2)
    expect(screen.getByText('MISSING')).toBeInTheDocument()
    expect(screen.getByText('MASKED')).toBeInTheDocument()
    expect(screen.getByText(/5 periods, 3 valid/)).toBeInTheDocument()
    expect(screen.getByText(/Demo coverage: 72%/)).toBeInTheDocument()
  })
})
