import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { SeriesPoint, SeriesResponse } from '../../src/api/client'
import { ChartWorkspace } from '../../src/components/ChartWorkspace'
import { EMPTY_TEMPORAL_FILTERS } from '../../src/temporal'

const POINTS: SeriesPoint[] = [
  {
    parameter: 'ndvi',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    value: 0,
    unit: 'unitless',
    state: 'VALID',
    qualityStatus: 'VALID',
    coverage: null,
    note: null,
  },
  {
    parameter: 'ndvi',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    value: null,
    unit: 'unitless',
    state: 'MISSING',
    qualityStatus: 'UNKNOWN',
    coverage: null,
    note: 'No observation.',
  },
  {
    parameter: 'ndvi',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    value: null,
    unit: 'unitless',
    state: 'MASKED',
    qualityStatus: 'PARTIAL',
    coverage: 0.4,
    note: 'Masked.',
  },
  {
    parameter: 'ndvi',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    value: null,
    unit: 'unitless',
    state: 'INVALID',
    qualityStatus: 'UNKNOWN',
    coverage: null,
    note: 'Invalid.',
  },
]

const SERIES: SeriesResponse = {
  resultId: 'result-1',
  productId: 'ndvi',
  geometryWkt: 'POINT(1.44 43.6)',
  crs: 'EPSG:4326',
  selectionType: 'Point',
  aggregationMethod: 'point_sample',
  selectionAreaKm2: 0,
  units: 'unitless',
  availableParameters: [{ name: 'ndvi', label: 'NDVI', units: 'unitless' }],
  selectedParameters: ['ndvi'],
  provenance: 'SYNTHETIC_DEMO',
  qualityStatus: 'PARTIAL',
  qualityNote: 'Demo.',
  coverage: 0.72,
  isDemo: true,
  note: 'Demo series.',
  points: POINTS,
}

function renderWorkspace(open = true, onClose = vi.fn()) {
  return render(
    <ChartWorkspace
      open={open}
      onClose={onClose}
      productName="NDVI"
      resultId="result-1"
      resultVersion="1"
      periodLabel="2026-01 to 2026-04 UTC"
      selectionLabel="Point selection · POINT(1.44 43.6) · EPSG:4326"
      series={SERIES}
      points={POINTS}
      availableParameters={SERIES.availableParameters}
      selectedParameters={SERIES.selectedParameters}
      onToggleParameter={vi.fn()}
      filters={EMPTY_TEMPORAL_FILTERS}
      hemisphere="northern"
      onFiltersChange={vi.fn()}
      onResetFilters={vi.fn()}
    />,
  )
}

describe('ChartWorkspace', () => {
  it('renders nothing while closed', { tags: ['unit'] }, () => {
    renderWorkspace(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the chart context, counts and close action', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWorkspace(true, onClose)
    const dialog = screen.getByRole('dialog', { name: 'NDVI time series' })
    expect(within(dialog).getByText(/version 1/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Showing 4 of 4 period values/)).toBeInTheDocument()
    expect(within(dialog).getByText('Valid: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Missing: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Masked: 1')).toBeInTheDocument()
    expect(within(dialog).getByText('Invalid: 1')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close chart workspace' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape and backdrop clicks', { tags: ['unit'] }, () => {
    const onClose = vi.fn()
    const { unmount } = renderWorkspace(true, onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()

    const backdropClose = vi.fn()
    const { container } = renderWorkspace(true, backdropClose)
    const backdrop = container.querySelector('.chart-workspace-backdrop')
    expect(backdrop).not.toBeNull()
    fireEvent.mouseDown(backdrop as Element)
    expect(backdropClose).toHaveBeenCalledTimes(1)
  })

  it('traps keyboard focus and restores it to the opener', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Opener
          </button>
          <ChartWorkspace
            open={open}
            onClose={() => setOpen(false)}
            productName="NDVI"
            resultId="result-1"
            resultVersion="1"
            periodLabel="2026-01 to 2026-04 UTC"
            selectionLabel="Point selection"
            series={SERIES}
            points={POINTS}
            availableParameters={SERIES.availableParameters}
            selectedParameters={SERIES.selectedParameters}
            onToggleParameter={vi.fn()}
            filters={EMPTY_TEMPORAL_FILTERS}
            hemisphere="northern"
            onFiltersChange={vi.fn()}
            onResetFilters={vi.fn()}
          />
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Opener' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog')
    const close = within(dialog).getByRole('button', { name: 'Close chart workspace' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(dialog.contains(document.activeElement)).toBe(true)

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    focusable[focusable.length - 1].focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()

    await user.click(close)
    expect(opener).toHaveFocus()
  })
  it(
    'ignores unrelated keys and inside clicks, and handles a null version',
    { tags: ['unit'] },
    () => {
      const onClose = vi.fn()
      const laterClose = vi.fn()
      const { container, rerender } = render(
        <ChartWorkspace
          open
          onClose={onClose}
          productName="NDVI"
          resultId="result-1"
          resultVersion={null}
          periodLabel="2026-01 to 2026-04 UTC"
          selectionLabel="Point selection"
          series={SERIES}
          points={POINTS}
          availableParameters={SERIES.availableParameters}
          selectedParameters={SERIES.selectedParameters}
          onToggleParameter={vi.fn()}
          filters={EMPTY_TEMPORAL_FILTERS}
          hemisphere="northern"
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
        />,
      )
      expect(screen.queryByText(/version/)).not.toBeInTheDocument()
      const dialog = screen.getByRole('dialog')
      fireEvent.mouseDown(dialog)
      expect(onClose).not.toHaveBeenCalled()
      fireEvent.keyDown(document, { key: 'a' })
      expect(onClose).not.toHaveBeenCalled()

      rerender(
        <ChartWorkspace
          open
          onClose={laterClose}
          productName="NDVI"
          resultId="result-1"
          resultVersion="1"
          periodLabel="2026-01 to 2026-04 UTC"
          selectionLabel="Point selection"
          series={SERIES}
          points={POINTS}
          availableParameters={SERIES.availableParameters}
          selectedParameters={SERIES.selectedParameters}
          onToggleParameter={vi.fn()}
          filters={EMPTY_TEMPORAL_FILTERS}
          hemisphere="northern"
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
        />,
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(laterClose).toHaveBeenCalled()
      expect(container.querySelector('.chart-workspace')).not.toBeNull()
    },
  )

  it('safely handles a dialog without focusable controls', { tags: ['unit'] }, () => {
    renderWorkspace(true)
    const spy = vi
      .spyOn(HTMLElement.prototype, 'querySelectorAll')
      .mockReturnValue([] as unknown as NodeListOf<HTMLElement>)
    fireEvent.keyDown(document, { key: 'Tab' })
    spy.mockRestore()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it(
    'offers available series parameters independently of the result',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      const onToggleParameter = vi.fn()
      const series: SeriesResponse = {
        ...SERIES,
        availableParameters: [
          { name: 'ndvi', label: 'NDVI', units: 'unitless' },
          { name: 'coverage', label: 'COVERAGE', units: 'fraction' },
        ],
        selectedParameters: ['ndvi'],
      }
      render(
        <ChartWorkspace
          open
          onClose={vi.fn()}
          productName="NDVI"
          resultId="result-1"
          resultVersion="1"
          periodLabel="2026-01 to 2026-04 UTC"
          selectionLabel="Point selection"
          series={series}
          points={POINTS}
          availableParameters={series.availableParameters}
          selectedParameters={series.selectedParameters}
          onToggleParameter={onToggleParameter}
          filters={EMPTY_TEMPORAL_FILTERS}
          hemisphere="northern"
          onFiltersChange={vi.fn()}
          onResetFilters={vi.fn()}
        />,
      )
      expect(screen.getByText('Displayed parameters')).toBeInTheDocument()
      await user.click(screen.getByRole('checkbox', { name: 'COVERAGE (fraction)' }))
      expect(onToggleParameter).toHaveBeenCalledWith('coverage')
    },
  )
})
