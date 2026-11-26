import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResultFrameBadge } from '../../src/components/ResultFrameBadge'

const FRAME = {
  id: 'frame-1',
  url: '/demo-assets/ndvi/frame-1.png',
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  label: '2026-01',
  visualPeriodStart: '2025-06-01',
  visualPeriodEnd: '2025-07-31',
  isReusedVisual: true,
}

describe('ResultFrameBadge', () => {
  it('renders the selected frame period and provenance', { tags: ['unit'] }, () => {
    render(<ResultFrameBadge productName="NDVI" frame={FRAME} provenance="SYNTHETIC_DEMO" />)
    expect(screen.getByText('NDVI')).toBeInTheDocument()
    expect(screen.getByText('2026-01-01 → 2026-01-31')).toBeInTheDocument()
    expect(screen.getByText(/SYNTHETIC_DEMO/)).toBeInTheDocument()
  })

  it('renders nothing without a frame and defaults the provenance', { tags: ['unit'] }, () => {
    const { container, rerender } = render(
      <ResultFrameBadge productName="NDVI" frame={null} provenance={null} />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<ResultFrameBadge productName="NDVI" frame={FRAME} provenance={null} />)
    expect(screen.getByText(/SYNTHETIC_DEMO/)).toBeInTheDocument()
  })
})
