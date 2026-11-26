import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REQUEST, SUCCEEDED_REQUEST, PRODUCT, renderApp, resetFixtures } from './app/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  resetFixtures()
})

describe('App shell and request lifecycle', () => {
  it(
    'loads the catalogue and exposes honest synthetic capabilities',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      renderApp({ demo: true })
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      await user.click(await screen.findByRole('button', { name: /NDVI/ }))
      expect((await screen.findAllByText(PRODUCT.description)).length).toBeGreaterThan(0)
      expect(
        screen.getByText('Demo data: this workspace is not showing real EO processing.'),
      ).toBeInTheDocument()
      expect(screen.getAllByText('SYNTHETIC_DEMO').length).toBeGreaterThan(0)
      expect(screen.getByText('POINT, POLYGON, RESULT_EXTENT')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Compatibility descriptors only. No mission data is acquired or used in M0.',
        ),
      ).toBeInTheDocument()
    },
  )

  it(
    'submits a request immediately as queued and zooms when an AOI is selected',
    { tags: ['unit'] },
    async () => {
      const { fetchMock } = renderApp({ pollIntervalMs: 100000 })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      await user.click(await screen.findByRole('button', { name: /NDVI/ }))
      await user.click(screen.getByRole('button', { name: 'Configure request' }))

      await user.click(screen.getByRole('button', { name: 'Toulouse study area' }))
      expect(screen.getByLabelText('Map focus')).toHaveTextContent('Bounds 43.56,1.38,43.66,1.49')

      await user.type(screen.getByLabelText('Start month (UTC)'), '2026-01')
      await user.type(screen.getByLabelText('End month (UTC)'), '2026-02')
      await user.selectOptions(screen.getByLabelText('Temporal frequency'), 'monthly')
      await screen.findByText('Admitted')
      await user.click(screen.getByRole('button', { name: 'Submit request' }))

      expect(await screen.findByText('queued')).toBeInTheDocument()
      expect(screen.getByText('Request request-new')).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/analysis-requests',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"aoi_id":"aoi-1"'),
        }),
      )
    },
  )

  it(
    'draws a polygon with the injected map and persists it as a saved AOI',
    { tags: ['unit'] },
    async () => {
      const { fetchMock } = renderApp()
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Draw a new AOI polygon' }))
      const point = await screen.findByRole('button', { name: 'Add map point' })
      await user.click(point)
      await user.click(point)
      await user.click(point)
      await user.type(screen.getByLabelText('Area name'), 'New area')
      await user.click(screen.getByRole('button', { name: 'Save AOI' }))
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/aois',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(
            '"coordinates":[[[1.42,43.6],[1.43,43.61],[1.42,43.62],[1.42,43.6]]]',
          ),
        }),
      )
    },
  )

  it(
    'updates an active request automatically through REST polling',
    { tags: ['unit'] },
    async () => {
      renderApp({
        requestSequence: [
          REQUEST,
          { ...REQUEST, state: 'processing', message: 'Synthetic demo processing is in progress.' },
          SUCCEEDED_REQUEST,
        ],
        pollIntervalMs: 250,
      })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /^Requests/ }))
      expect(await screen.findByText('queued')).toBeInTheDocument()
      expect(await screen.findByText('processing')).toBeInTheDocument()
      expect(await screen.findByText('succeeded')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Display on map' })).toBeEnabled()
    },
  )

  it(
    'recovers the authoritative request state via REST after a reload',
    { tags: ['unit'] },
    async () => {
      renderApp({ request: SUCCEEDED_REQUEST })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /^Requests/ }))
      expect(await screen.findByText('succeeded')).toBeInTheDocument()
      expect(screen.getByText('Request request-1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Display on map' })).toBeEnabled()
    },
  )

  it(
    'shows catalogue and request load errors without inventing data',
    { tags: ['unit'] },
    async () => {
      renderApp({ catalogueFails: true, requestsFail: true })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Explore' }))
      expect(await screen.findByText('The product catalogue is unavailable.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /NDVI/ })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Close Product catalogue' }))
      await user.click(screen.getByRole('button', { name: /^Requests/ }))
      expect(await screen.findByText('Requests are unavailable.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Display on map' })).not.toBeInTheDocument()
    },
  )

  it(
    'supports geographic search, credits, indicators and account panels',
    { tags: ['unit'] },
    async () => {
      renderApp({ credits: { balance: 7, unit: 'credits' } })
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Search location'), 'London')
      await user.click(await screen.findByRole('option', { name: /London/ }))
      expect(screen.getByLabelText('Map focus')).toHaveTextContent('51.5072,-0.1276')

      const credits = await screen.findByRole('button', { name: /Credit balance: 7 credits/ })
      await user.click(credits)
      const accountPanel = await screen.findByRole('complementary', { name: 'Account and credits' })
      expect(within(accountPanel).getByText('7 credits')).toBeInTheDocument()
      await user.click(
        within(accountPanel).getByRole('button', { name: 'Close Account and credits' }),
      )

      await user.click(screen.getByRole('button', { name: 'Indicators' }))
      expect(await screen.findByText('No indicators are configured.')).toBeInTheDocument()
    },
  )

  it('keeps the result inspector toggle sticky and visible', { tags: ['unit'] }, async () => {
    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Requests/ }))
    await user.click(await screen.findByRole('button', { name: 'Display on map' }))
    expect(screen.getByRole('button', { name: 'Hide result inspector' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Hide result inspector' }).closest('.bottom-inspector'),
    ).not.toBeNull()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Hide result inspector' })).toBeVisible(),
    )
  })
})
