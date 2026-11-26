import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceHeader } from '../../src/components/WorkspaceHeader'

const SUGGESTIONS = [
  {
    id: 'coordinate',
    kind: 'coordinate' as const,
    label: '48.8566, 2.3522',
    detail: 'Coordinates',
    icon: 'map-pin' as const,
    focus: { type: 'point' as const, lat: 48.8566, lng: 2.3522, zoom: 13 },
  },
  {
    id: 'place-1',
    kind: 'place' as const,
    label: 'Toulouse',
    detail: 'Occitanie, France',
    icon: 'compass' as const,
    focus: { type: 'point' as const, lat: 43.6, lng: 1.44, zoom: 10 },
  },
]

function renderHeader(overrides: Partial<Parameters<typeof WorkspaceHeader>[0]> = {}) {
  const props: Parameters<typeof WorkspaceHeader>[0] = {
    panel: null,
    activeRequestCount: 0,
    togglePanel: vi.fn(),
    searchQuery: '',
    searchOpen: false,
    suggestions: [],
    placesLoading: false,
    placesFallback: false,
    highlightedSuggestion: -1,
    searchInputRef: createRef<HTMLInputElement>(),
    searchContainerRef: createRef<HTMLFormElement>(),
    submitSearch: vi.fn(),
    changeSearch: vi.fn(),
    handleSearchKeyDown: vi.fn(),
    clearSearch: vi.fn(),
    chooseSuggestion: vi.fn(),
    setSearchOpen: vi.fn(),
    creditSummary: '12 credits',
    account: { userId: 'demo-user', displayName: 'Demo user', sessionStatus: 'AUTHENTICATED' },
    sessionActive: true,
    accountOpen: false,
    accountMenuRef: createRef<HTMLDivElement>(),
    accountButtonRef: createRef<HTMLButtonElement>(),
    onToggleAccount: vi.fn(),
    onOpenAccount: vi.fn(),
    onRefreshBalance: vi.fn(),
    ...overrides,
  }
  const view = render(<WorkspaceHeader {...props} />)
  return { ...view, ...props }
}

describe('WorkspaceHeader', () => {
  it('renders navigation, badges and credits', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const header = renderHeader({ activeRequestCount: 3, panel: 'requests' })
    await user.click(screen.getByRole('button', { name: 'Explore' }))
    await user.click(screen.getByRole('button', { name: /^Requests/ }))
    await user.click(screen.getByRole('button', { name: 'Indicators' }))
    expect(header.togglePanel).toHaveBeenCalledWith('catalogue')
    expect(header.togglePanel).toHaveBeenCalledWith('requests')
    expect(header.togglePanel).toHaveBeenCalledWith('indicators')
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Credit balance: 12 credits/ })).toBeInTheDocument()
  })

  it(
    'renders search loading, fallback and selectable suggestions',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      const header = renderHeader({ searchOpen: true, placesLoading: true })
      expect(screen.getByText('Searching places…')).toBeInTheDocument()
      header.unmount()

      const fallback = renderHeader({
        searchOpen: true,
        suggestions: SUGGESTIONS,
        placesFallback: true,
        highlightedSuggestion: 1,
        searchQuery: 'toulouse',
      })
      expect(screen.getByText(/limited offline fallback/)).toBeInTheDocument()
      expect(screen.getAllByRole('option')).toHaveLength(2)
      await user.click(screen.getByRole('option', { name: /Toulouse/ }))
      expect(fallback.chooseSuggestion).toHaveBeenCalledWith(SUGGESTIONS[1])
      await user.click(screen.getByRole('button', { name: 'Clear search' }))
      expect(fallback.clearSearch).toHaveBeenCalled()
      fallback.unmount()

      renderHeader({ searchOpen: true, suggestions: [], placesLoading: false })
      expect(screen.getByText('No matching place, coordinates, or saved AOI.')).toBeInTheDocument()
    },
  )

  it('renders account menu states and actions', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const open = renderHeader({ accountOpen: true })
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Account and credits' }))
    await user.click(screen.getByRole('menuitem', { name: 'Refresh credit balance' }))
    expect(open.onOpenAccount).toHaveBeenCalled()
    expect(open.onRefreshBalance).toHaveBeenCalled()
    open.unmount()

    renderHeader({ sessionActive: false, account: null, accountOpen: true })
    expect(screen.getByText('Signed out')).toBeInTheDocument()
    expect(screen.getByText('No active session')).toBeInTheDocument()
  })
})
