import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import type { Aoi } from '../api/client'
import type { MapFocus } from '../map/coordinates'
import { buildSearchSuggestions, type SearchSuggestion } from './search'

type SearchOptions = {
  aois: Aoi[]
  applyFocus: (focus: MapFocus | null) => void
  selectAoi: (id: string, options?: { reserveRightPanel?: boolean }) => Promise<void>
  openAoisPanel: () => void
}

export function useSearch({ aois, applyFocus, selectAoi, openAoisPanel }: SearchOptions) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    const closeOnOutsidePointer = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setSearchOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [searchOpen])

  const suggestions = buildSearchSuggestions(searchQuery, aois)
  const highlightedSuggestion = suggestions.length
    ? Math.min(activeSuggestion, suggestions.length - 1)
    : -1

  function chooseSuggestion(suggestion: SearchSuggestion): void {
    searchInputRef.current?.blur()
    setSearchOpen(false)
    setActiveSuggestion(0)
    setSearchQuery(suggestion.label)
    if (suggestion.kind === 'aoi' && suggestion.aoiId) {
      openAoisPanel()
      void selectAoi(suggestion.aoiId, { reserveRightPanel: true })
      return
    }
    if (suggestion.focus) applyFocus(suggestion.focus)
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (suggestions.length === 0) {
      setSearchOpen(true)
      return
    }
    chooseSuggestion(suggestions[highlightedSuggestion])
  }

  function changeSearch(value: string): void {
    setSearchQuery(value)
    setSearchOpen(true)
    setActiveSuggestion(0)
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      if (searchOpen) {
        event.stopPropagation()
        setSearchOpen(false)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSearchOpen(true)
      if (suggestions.length) {
        setActiveSuggestion((index) => (index + 1) % suggestions.length)
      }
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (suggestions.length) {
        setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length)
      }
      return
    }
    if (event.key === 'Enter' && searchOpen && suggestions.length) {
      event.preventDefault()
      chooseSuggestion(suggestions[highlightedSuggestion])
    }
  }

  function clearSearch(): void {
    setSearchQuery('')
    setSearchOpen(false)
    searchInputRef.current?.focus()
  }

  return {
    searchQuery,
    searchOpen,
    activeSuggestion,
    suggestions,
    highlightedSuggestion,
    searchInputRef,
    searchContainerRef,
    setSearchOpen,
    chooseSuggestion,
    submitSearch,
    changeSearch,
    handleSearchKeyDown,
    clearSearch,
  }
}
