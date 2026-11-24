import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeriesPoint } from '../../src/api/client'
import { TemporalFilters } from '../../src/components/TemporalFilters'
import { EMPTY_TEMPORAL_FILTERS } from '../../src/temporal'

const POINTS: SeriesPoint[] = [
  {
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    value: 0.2,
    unit: 'unitless',
    state: 'VALID',
    qualityStatus: 'VALID',
    coverage: null,
    note: null,
  },
  {
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    value: 0.4,
    unit: 'unitless',
    state: 'VALID',
    qualityStatus: 'VALID',
    coverage: null,
    note: null,
  },
]

describe('TemporalFilters', () => {
  it('toggles years, months, seasons and resets', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onReset = vi.fn()
    render(
      <TemporalFilters
        points={POINTS}
        filters={EMPTY_TEMPORAL_FILTERS}
        hemisphere="northern"
        onChange={onChange}
        onReset={onReset}
      />,
    )
    await user.click(screen.getByRole('checkbox', { name: '2025' }))
    expect(onChange).toHaveBeenCalledWith({ years: [2025], months: [], seasons: [] })
    await user.click(screen.getByRole('checkbox', { name: 'January' }))
    expect(onChange).toHaveBeenCalledWith({ years: [], months: [1], seasons: [] })
    await user.click(screen.getByRole('checkbox', { name: 'Summer' }))
    expect(onChange).toHaveBeenCalledWith({ years: [], months: [], seasons: ['summer'] })
    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(onReset).toHaveBeenCalled()
  })

  it(
    'disables seasonal filters when the selection crosses the equator',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      render(
        <TemporalFilters
          points={POINTS}
          filters={{ years: [], months: [], seasons: [] }}
          hemisphere="mixed"
          onChange={vi.fn()}
          onReset={vi.fn()}
        />,
      )
      expect(screen.getByText(/crosses the equator/)).toBeInTheDocument()
      const winter = screen.getByRole('checkbox', { name: 'Winter' })
      expect(winter).toBeDisabled()
      await user.click(winter)
      expect(winter).not.toBeChecked()
    },
  )

  it('removes selected values when toggled again', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TemporalFilters
        points={POINTS}
        filters={{ years: [2025], months: [1], seasons: ['winter'] }}
        hemisphere="southern"
        onChange={onChange}
        onReset={vi.fn()}
      />,
    )
    expect(screen.getByText(/Southern Hemisphere/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: '2025' }))
    expect(onChange).toHaveBeenCalledWith({ years: [], months: [1], seasons: ['winter'] })
    await user.click(screen.getByRole('checkbox', { name: 'January' }))
    expect(onChange).toHaveBeenCalledWith({ years: [2025], months: [], seasons: ['winter'] })
    await user.click(screen.getByRole('checkbox', { name: 'Winter' }))
    expect(onChange).toHaveBeenCalledWith({ years: [2025], months: [1], seasons: [] })
  })
})
