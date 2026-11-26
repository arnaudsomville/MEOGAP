import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisRequest, Delivery } from '../../src/api/client'
import { RequestCard } from '../../src/components/RequestCard'

const REQUEST: AnalysisRequest = {
  id: 'request-1',
  state: 'queued',
  productId: 'ndvi',
  aoiId: 'aoi-1',
  aoiName: 'Toulouse',
  sourceAoiRevision: 1,
  geometrySnapshot: null,
  startMonth: '2026-01',
  endMonth: '2026-02',
  requestedSources: ['Sentinel'],
  requestedSpatialResolutionM: 20,
  temporalFrequency: 'monthly',
  provenance: 'SYNTHETIC_DEMO',
  estimatedCredits: 3,
  actualCredits: null,
  resultId: null,
  message: 'Queued.',
  failureStage: null,
}

function renderCard(
  overrides: Partial<AnalysisRequest> = {},
  delivery: Delivery | null = null,
  callbacks: Partial<Parameters<typeof RequestCard>[0]> = {},
) {
  const handlers = {
    onRefresh: vi.fn(),
    onCancel: vi.fn(),
    onDisplay: vi.fn(),
    onDelivery: vi.fn(),
    onRefreshDelivery: vi.fn(),
    ...callbacks,
  }
  const request = { ...REQUEST, ...overrides }
  const view = render(
    <RequestCard
      request={request}
      productName="NDVI"
      aoiName="Toulouse"
      delivery={delivery}
      {...handlers}
    />,
  )
  return { ...view, request, ...handlers }
}

describe('RequestCard', () => {
  it(
    'renders queued and processing states with refresh and cancellation',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      const handlers = renderCard()
      expect(screen.getByText('queued')).toBeInTheDocument()
      expect(screen.getByText(/Request queued/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Refresh' }))
      await user.click(screen.getByRole('button', { name: 'Cancel request' }))
      expect(handlers.onRefresh).toHaveBeenCalledWith('request-1')
      expect(handlers.onCancel).toHaveBeenCalledWith('request-1')

      renderCard({ state: 'processing', message: 'Working.' })
      expect(screen.getAllByText('processing').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Synthetic demo processing/).length).toBeGreaterThan(0)
    },
  )

  it('renders failed and succeeded actions', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const failed = renderCard({ state: 'failed', failureStage: 'processing', message: 'Broken.' })
    expect(screen.getByText(/Failed during processing/)).toBeInTheDocument()
    failed.unmount()

    const handlers = renderCard({ state: 'succeeded', resultId: 'result-1', actualCredits: 2 })
    await user.click(screen.getByRole('button', { name: 'Display on map' }))
    await user.click(screen.getByRole('button', { name: 'Final product' }))
    await user.click(screen.getByRole('button', { name: 'Full archive' }))
    expect(handlers.onDisplay).toHaveBeenCalled()
    expect(handlers.onDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' }),
      'final_product',
    )
    expect(handlers.onDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' }),
      'dependency_archive',
    )
    expect(screen.queryByRole('button', { name: 'Cancel request' })).not.toBeInTheDocument()
  })

  it('renders delivery states and exposes the download link', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const ready: Delivery = {
      id: 'delivery-1',
      kind: 'final_product',
      state: 'READY',
      downloadUrl: 'https://example.test/product.geojson',
      message: 'Ready.',
    }
    const readyRender = renderCard({ state: 'succeeded', resultId: 'result-1' }, ready)
    expect(screen.getByRole('link', { name: 'Download product' })).toHaveAttribute(
      'href',
      'https://example.test/product.geojson',
    )
    readyRender.unmount()

    const archive = renderCard(
      { state: 'succeeded', resultId: 'result-1' },
      { ...ready, kind: 'dependency_archive', downloadUrl: 'https://example.test/archive.geojson' },
    )
    expect(screen.getByRole('link', { name: 'Download archive' })).toBeInTheDocument()
    archive.unmount()

    const preparing = renderCard(
      { state: 'succeeded', resultId: 'result-1' },
      { ...ready, state: 'PREPARING', downloadUrl: null },
    )
    await user.click(screen.getByRole('button', { name: 'Refresh delivery' }))
    expect(preparing.onRefreshDelivery).toHaveBeenCalled()
    preparing.unmount()

    const failedDelivery = renderCard(
      { state: 'succeeded', resultId: 'result-1' },
      { ...ready, state: 'FAILED', downloadUrl: null },
    )
    expect(screen.getByText('The delivery could not be prepared.')).toBeInTheDocument()
    failedDelivery.unmount()

    renderCard({ state: 'succeeded', resultId: 'result-1' }, { ...ready, downloadUrl: null })
    expect(
      screen.getByText('The delivery is ready but no download URL was provided.'),
    ).toBeInTheDocument()
  })
  it('renders missing result and source context explicitly', { tags: ['unit'] }, () => {
    renderCard({
      state: 'succeeded',
      resultId: null,
      requestedSources: [],
      estimatedCredits: null,
      actualCredits: null,
      failureStage: null,
    })
    expect(screen.getByText('No source restriction')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Succeeded, but no result identifier was provided for map or delivery access.',
      ),
    ).toBeInTheDocument()
  })
  it('renders failed requests without a stage and undelivered kinds', { tags: ['unit'] }, () => {
    renderCard({ state: 'failed', failureStage: null, message: 'Broken.' })
    expect(screen.getByText('Failed.')).toBeInTheDocument()
    renderCard(
      { state: 'succeeded', resultId: 'result-1' },
      { id: 'delivery-1', kind: null, state: 'PREPARING', downloadUrl: null, message: null },
    )
    expect(screen.getByText(/Delivery/)).toBeInTheDocument()
  })
})
