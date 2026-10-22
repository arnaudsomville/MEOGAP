import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'

function mockHealth() {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ status: 'ok', core_version: '0.1.0' }),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the API health and core version', async () => {
    const fetchMock = mockHealth()

    render(<App />)

    expect(await screen.findByText(/API: ok/)).toBeInTheDocument()
    expect(screen.getByText(/core 0.1.0/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health')
  })

  it('switches to the requests view', async () => {
    mockHealth()
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Requests' }))

    expect(screen.getByText(/No requests yet/)).toBeInTheDocument()
  })
})
