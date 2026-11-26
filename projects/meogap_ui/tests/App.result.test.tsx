import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SERIES_PAYLOAD,
  SERIES_TWO_PARAMETERS,
  SUCCEEDED_REQUEST,
  renderApp,
  resetFixtures,
} from './app/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  resetFixtures()
})

async function openDisplayedResult() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /^Requests/ }))
  await user.click(await screen.findByRole('button', { name: 'Display on map' }))
  await screen.findByText('Result inspector')
  return user
}

describe('App result exploration', () => {
  it(
    'displays the georeferenced result frame date on the map without surface statistics',
    { tags: ['unit'] },
    async () => {
      renderApp({ request: SUCCEEDED_REQUEST })
      const user = await openDisplayedResult()
      expect(screen.getByText('2026-01-01 → 2026-01-31')).toBeInTheDocument()
      expect(screen.getAllByText(/SYNTHETIC_DEMO/).length).toBeGreaterThan(0)
      const slider = screen.getByLabelText('Displayed frame')
      fireEvent.change(slider, { target: { value: '1' } })
      expect(await screen.findByText('2026-02-01 → 2026-02-28')).toBeInTheDocument()
      expect(screen.queryByText(/km²/)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Hide result layer' }))
      expect(screen.queryByText('2026-02-01 → 2026-02-28')).not.toBeInTheDocument()
    },
  )

  it(
    'selects a point and transmits explicit WKT and CRS to the Gateway',
    { tags: ['unit'] },
    async () => {
      const { fetchMock } = renderApp({ request: SUCCEEDED_REQUEST })
      const user = await openDisplayedResult()
      await user.click(screen.getByRole('button', { name: 'Select point' }))
      await user.click(screen.getByRole('button', { name: 'Result point click' }))
      expect(screen.getAllByText(/POINT\(1.44 43.6\)/).length).toBeGreaterThan(0)
      await user.click(screen.getByRole('button', { name: 'Open time series' }))
      expect(await screen.findByRole('dialog', { name: 'NDVI time series' })).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/results/result-1/series',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"geometry_wkt":"POINT(1.44 43.6)"'),
        }),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/results/result-1/series',
        expect.objectContaining({
          body: expect.stringContaining('"crs":"EPSG:4326"'),
        }),
      )
    },
  )

  it('draws a polygon and transmits a polygon WKT selection', { tags: ['unit'] }, async () => {
    const { fetchMock } = renderApp({ request: SUCCEEDED_REQUEST })
    const user = await openDisplayedResult()
    await user.click(screen.getByRole('button', { name: 'Draw polygon' }))
    await user.click(screen.getByRole('button', { name: 'Result polygon click A' }))
    await user.click(screen.getByRole('button', { name: 'Result polygon click B' }))
    await user.click(screen.getByRole('button', { name: 'Result polygon click C' }))
    await user.click(screen.getByRole('button', { name: 'Open time series' }))
    await screen.findByRole('dialog', { name: 'NDVI time series' })
    const seriesCall = fetchMock.mock.calls.find(
      ([path, init]) =>
        path === '/api/v1/results/result-1/series' &&
        (init as RequestInit | undefined)?.method === 'POST',
    )
    const body = JSON.parse(String((seriesCall?.[1] as RequestInit).body)) as {
      geometry_wkt: string
      crs: string
    }
    expect(body.geometry_wkt.startsWith('POLYGON((')).toBe(true)
    expect(body.crs).toBe('EPSG:4326')
  })

  it('keeps missing periods as gaps rather than zero values', { tags: ['unit'] }, async () => {
    renderApp({ request: SUCCEEDED_REQUEST, series: SERIES_PAYLOAD })
    const user = await openDisplayedResult()
    await user.click(screen.getByRole('button', { name: 'Select point' }))
    await user.click(screen.getByRole('button', { name: 'Result point click' }))
    await user.click(screen.getByRole('button', { name: 'Open time series' }))
    const dialog = await screen.findByRole('dialog', { name: 'NDVI time series' })
    expect(within(dialog).getAllByText('No value').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('MISSING').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('MASKED').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('0 unitless')).toBeInTheDocument()
  })

  it(
    'combines month and season display filters over available observations',
    { tags: ['unit'] },
    async () => {
      renderApp({ request: SUCCEEDED_REQUEST, series: SERIES_PAYLOAD })
      const user = await openDisplayedResult()
      await user.click(screen.getByRole('button', { name: 'Select point' }))
      await user.click(screen.getByRole('button', { name: 'Result point click' }))
      await user.click(screen.getByRole('button', { name: 'Open time series' }))
      const dialog = await screen.findByRole('dialog', { name: 'NDVI time series' })
      await user.click(within(dialog).getByRole('checkbox', { name: 'January' }))
      expect(within(dialog).getAllByText('2026-01').length).toBeGreaterThan(0)
      expect(within(dialog).queryByText('2026-02')).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole('checkbox', { name: 'Summer' }))
      expect(within(dialog).getAllByText('2026-06').length).toBeGreaterThan(0)
      expect(within(dialog).getAllByText('2026-07').length).toBeGreaterThan(0)
      expect(within(dialog).queryByText('2026-03')).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Reset filters' }))
      expect(within(dialog).getAllByText('2026-03').length).toBeGreaterThan(0)
    },
  )

  it(
    'selects available chart parameters independently and reports unavailable data honestly',
    { tags: ['unit'] },
    async () => {
      renderApp({ request: SUCCEEDED_REQUEST, series: SERIES_TWO_PARAMETERS })
      const user = await openDisplayedResult()
      await user.click(screen.getByRole('button', { name: 'Select point' }))
      await user.click(screen.getByRole('button', { name: 'Result point click' }))
      await user.click(screen.getByRole('button', { name: 'Open time series' }))
      const dialog = await screen.findByRole('dialog', { name: 'NDVI time series' })
      expect(within(dialog).getByText('Displayed parameters')).toBeInTheDocument()
      await user.click(within(dialog).getByRole('checkbox', { name: 'COVERAGE (fraction)' }))
      expect(within(dialog).getByRole('region', { name: 'COVERAGE series' })).toBeInTheDocument()
      expect(
        within(dialog).getByText('No observation matches the selected temporal display filters.'),
      ).toBeInTheDocument()
    },
  )

  it('uses the complete result geometry as an explicit selection', { tags: ['unit'] }, async () => {
    renderApp({ request: SUCCEEDED_REQUEST })
    const user = await openDisplayedResult()
    await user.click(screen.getByRole('button', { name: 'Use result geometry' }))
    expect(screen.getByText(/entire result geometry/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Selected geometry WKT')).toHaveTextContent('POLYGON')
  })

  it('rejects a click outside the displayed result extent', { tags: ['unit'] }, async () => {
    renderApp({ request: SUCCEEDED_REQUEST })
    const user = await openDisplayedResult()
    await user.click(screen.getByRole('button', { name: 'Select point' }))
    await user.click(screen.getByRole('button', { name: 'Result click outside' }))
    expect(
      await screen.findByText('The selected position is outside the displayed result.'),
    ).toBeInTheDocument()
  })

  it('shows a series error without opening an empty chart', { tags: ['unit'] }, async () => {
    renderApp({ request: SUCCEEDED_REQUEST, seriesFails: true })
    const user = await openDisplayedResult()
    await user.click(screen.getByRole('button', { name: 'Select point' }))
    await user.click(screen.getByRole('button', { name: 'Result point click' }))
    await user.click(screen.getByRole('button', { name: 'Open time series' }))
    expect(await screen.findByText('Series unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'NDVI time series' })).not.toBeInTheDocument()
  })

  it('creates a delivery from the Requests workspace only', { tags: ['unit'] }, async () => {
    renderApp({ request: SUCCEEDED_REQUEST })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Requests/ }))
    await user.click(await screen.findByRole('button', { name: 'Final product' }))
    expect(await screen.findByRole('link', { name: 'Download product' })).toHaveAttribute(
      'href',
      'https://example.test/result.geojson',
    )
    await waitFor(() => expect(screen.getByText('READY')).toBeInTheDocument())
  })
})
