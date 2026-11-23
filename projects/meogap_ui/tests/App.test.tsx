import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { Health } from '../src/api/client'

function mockHealth(health: Health = { status: 'ok', service: 'gat', version: '0.1.0' }) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => health,
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the API health, service, and version', { tags: ['unit'] }, async () => {
    const fetchMock = mockHealth()

    render(<App />)

    expect(await screen.findByText(/API: ok/)).toBeInTheDocument()
    expect(screen.getByText(/gat 0.1.0/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health')
  })

  it('renders the explore view by default', { tags: ['unit'] }, async () => {
    mockHealth()

    render(<App />)

    await screen.findByText(/API: ok/)
    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument()
  })

  it('switches between requests and explore views', { tags: ['unit'] }, async () => {
    mockHealth()
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Requests' }))
    expect(screen.getByText(/No requests yet/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Explore' }))
    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument()
  })

  it('reports an unreachable API when the health request fails', { tags: ['unit'] }, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )

    render(<App />)

    expect(await screen.findByText(/API: unreachable/)).toBeInTheDocument()
  })

  it('ignores health updates after unmount', { tags: ['unit'] }, async () => {
    type FetchResult = { ok: boolean; json: () => Promise<Health> }
    let resolveFetch!: (value: FetchResult) => void
    const pending = new Promise<FetchResult>((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending),
    )

    const { unmount } = render(<App />)
    unmount()
    resolveFetch({
      ok: true,
      json: async () => ({ status: 'ok', service: 'gat', version: '0.1.0' }),
    })
    await pending
    await Promise.resolve()
  })

  it('ignores health errors after unmount', { tags: ['unit'] }, async () => {
    type FetchResult = { ok: boolean; json: () => Promise<Health> }
    let rejectFetch!: (reason: Error) => void
    const pending = new Promise<FetchResult>((_, reject) => {
      rejectFetch = reject
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pending),
    )

    const { unmount } = render(<App />)
    unmount()
    rejectFetch(new Error('network down'))
    await pending.catch(() => undefined)
    await Promise.resolve()
  })
})
