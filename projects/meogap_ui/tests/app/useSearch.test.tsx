import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlaceSuggestions, type Aoi, type PlaceSuggestion } from '../../src/api/client'
import { useSearch } from '../../src/app/useSearch'
import { AOI } from './fixtures'

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>()
  return {
    ...actual,
    getPlaceSuggestions: vi.fn(),
  }
})

const AOI_VIEW: Aoi = {
  ...AOI,
  id: AOI.aoi_id,
  createdAt: AOI.created_at,
  updatedAt: AOI.updated_at,
}
const PLACE: PlaceSuggestion = {
  placeId: 1,
  name: 'Toulouse',
  country: 'France',
  admin1: 'Occitanie',
  latitude: 43.6045,
  longitude: 1.4442,
  population: 511684,
  featureCode: 'PPLA',
  matchType: 'exact',
}

function setup() {
  const applyFocus = vi.fn()
  const selectAoi = vi.fn(async () => undefined)
  const openAoisPanel = vi.fn()
  const hook = renderHook(() =>
    useSearch({ aois: [AOI_VIEW], applyFocus, selectAoi, openAoisPanel }),
  )
  return { ...hook, applyFocus, selectAoi, openAoisPanel }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPlaceSuggestions).mockResolvedValue({
    data: { items: [PLACE] },
    isDemo: false,
  })
})

describe('useSearch', () => {
  it(
    'loads populated places and combines them with AOIs and coordinates',
    { tags: ['unit'] },
    async () => {
      const hook = setup()
      act(() => hook.result.current.setSearchOpen(true))
      await waitFor(() => expect(hook.result.current.suggestions.length).toBeGreaterThan(0))
      expect(hook.result.current.suggestions.some((item) => item.kind === 'place')).toBe(true)

      act(() => hook.result.current.changeSearch('toulouse'))
      await waitFor(() =>
        expect(hook.result.current.suggestions.some((item) => item.kind === 'aoi')).toBe(true),
      )
      const place = hook.result.current.suggestions.find((item) => item.kind === 'place')
      expect(place).toBeDefined()
      act(() => {
        if (place) hook.result.current.chooseSuggestion(place)
      })
      expect(hook.applyFocus).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'point', lat: 43.6045, lng: 1.4442 }),
      )

      act(() => hook.result.current.changeSearch('48.8566, 2.3522'))
      const coordinate = hook.result.current.suggestions.find((item) => item.kind === 'coordinate')
      expect(coordinate).toBeDefined()
      act(() => {
        if (coordinate) hook.result.current.chooseSuggestion(coordinate)
      })
      expect(hook.applyFocus).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 48.8566, lng: 2.3522 }),
      )
    },
  )

  it('selects a saved AOI suggestion through the AOI workflow', { tags: ['unit'] }, async () => {
    const hook = setup()
    act(() => hook.result.current.changeSearch('toulouse'))
    const aoi = hook.result.current.suggestions.find((item) => item.kind === 'aoi')
    expect(aoi).toBeDefined()
    act(() => {
      if (aoi) hook.result.current.chooseSuggestion(aoi)
    })
    expect(hook.openAoisPanel).toHaveBeenCalled()
    expect(hook.selectAoi).toHaveBeenCalledWith('aoi-1', { reserveRightPanel: true })
  })

  it(
    'falls back to the small local list when the Gateway is unavailable',
    { tags: ['unit'] },
    async () => {
      vi.mocked(getPlaceSuggestions).mockRejectedValueOnce(new Error('offline'))
      const hook = setup()
      act(() => hook.result.current.setSearchOpen(true))
      act(() => hook.result.current.changeSearch('london'))
      await waitFor(() =>
        expect(hook.result.current.suggestions.some((item) => item.label === 'London')).toBe(true),
      )
      expect(hook.result.current.placesFallback).toBe(true)
    },
  )

  it(
    'supports keyboard navigation, submission, Escape and clearing',
    { tags: ['unit'] },
    async () => {
      const hook = setup()
      act(() => hook.result.current.changeSearch('toulouse'))
      await waitFor(() => expect(hook.result.current.suggestions.length).toBeGreaterThan(1))
      act(() =>
        hook.result.current.handleSearchKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as never),
      )
      expect(hook.result.current.highlightedSuggestion).toBe(1)
      act(() =>
        hook.result.current.handleSearchKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as never),
      )
      const preventDefault = vi.fn()
      act(() => hook.result.current.handleSearchKeyDown({ key: 'Enter', preventDefault } as never))
      expect(preventDefault).toHaveBeenCalled()
      act(() =>
        hook.result.current.handleSearchKeyDown({
          key: 'Escape',
          stopPropagation: vi.fn(),
        } as never),
      )
      expect(hook.result.current.searchOpen).toBe(false)
      act(() => hook.result.current.setSearchOpen(true))
      act(() => hook.result.current.clearSearch())
      expect(hook.result.current.searchQuery).toBe('')
    },
  )
  it('handles empty submissions and keyboard edges', { tags: ['unit'] }, () => {
    const hook = setup()
    const preventDefault = vi.fn()
    act(() => hook.result.current.submitSearch({ preventDefault } as never))
    expect(preventDefault).toHaveBeenCalled()
    expect(hook.result.current.searchOpen).toBe(true)

    act(() =>
      hook.result.current.handleSearchKeyDown({
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as never),
    )
    act(() =>
      hook.result.current.handleSearchKeyDown({
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      } as never),
    )
    act(() =>
      hook.result.current.handleSearchKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
        // Search is closed, so Enter is ignored.
      } as never),
    )
    act(() =>
      hook.result.current.handleSearchKeyDown({
        key: 'Escape',
        stopPropagation: vi.fn(),
      } as never),
    )
    act(() => hook.result.current.setSearchOpen(false))
    act(() => hook.result.current.clearSearch())
    expect(hook.result.current.searchQuery).toBe('')
    expect(hook.result.current.searchOpen).toBe(false)
  })
})
