import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import type { Account } from '../api/client'
import type { Panel } from '../app/constants'
import type { SearchSuggestion } from '../app/search'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { NavButton } from './NavButton'

type WorkspaceHeaderProps = {
  panel: Panel
  activeRequestCount: number
  togglePanel: (panel: Exclude<Panel, null>) => void
  searchQuery: string
  searchOpen: boolean
  suggestions: SearchSuggestion[]
  highlightedSuggestion: number
  searchInputRef: RefObject<HTMLInputElement | null>
  searchContainerRef: RefObject<HTMLFormElement | null>
  submitSearch: (event: FormEvent<HTMLFormElement>) => void
  changeSearch: (value: string) => void
  handleSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  clearSearch: () => void
  chooseSuggestion: (suggestion: SearchSuggestion) => void
  setSearchOpen: (open: boolean) => void
  creditSummary: string
  account: Account | null
  sessionActive: boolean
  accountOpen: boolean
  accountMenuRef: RefObject<HTMLDivElement | null>
  accountButtonRef: RefObject<HTMLButtonElement | null>
  onToggleAccount: () => void
  onOpenAccount: () => void
  onRefreshBalance: () => void
}

export function WorkspaceHeader({
  panel,
  activeRequestCount,
  togglePanel,
  searchQuery,
  searchOpen,
  suggestions,
  highlightedSuggestion,
  searchInputRef,
  searchContainerRef,
  submitSearch,
  changeSearch,
  handleSearchKeyDown,
  clearSearch,
  chooseSuggestion,
  setSearchOpen,
  creditSummary,
  account,
  sessionActive,
  accountOpen,
  accountMenuRef,
  accountButtonRef,
  onToggleAccount,
  onOpenAccount,
  onRefreshBalance,
}: WorkspaceHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-brand" role="img" aria-label="MEOGAP">
          <Logo size={30} />
          <span className="brand-wordmark">MEOGAP</span>
        </div>
        <span className="topbar-divider" aria-hidden="true" />
        <nav className="main-nav" aria-label="Main navigation">
          <NavButton
            active={panel === 'catalogue'}
            icon="compass"
            label="Explore"
            onClick={() => togglePanel('catalogue')}
          />
          <NavButton
            active={panel === 'requests'}
            icon="clipboard"
            label="Requests"
            onClick={() => togglePanel('requests')}
            badge={activeRequestCount}
          />
          <NavButton
            active={panel === 'indicators'}
            icon="activity"
            label="Indicators"
            onClick={() => togglePanel('indicators')}
          />
        </nav>
      </div>

      <form
        ref={searchContainerRef}
        className="header-search"
        role="search"
        onSubmit={submitSearch}
      >
        <Icon name="search" className="header-search-icon" />
        <input
          ref={searchInputRef}
          id="geographic-search"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={searchOpen}
          aria-controls="geographic-search-suggestions"
          aria-activedescendant={
            searchOpen && highlightedSuggestion >= 0
              ? `search-suggestion-${highlightedSuggestion}`
              : undefined
          }
          aria-label="Search location"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search location (place, coordinates...)"
          value={searchQuery}
          onChange={(event) => changeSearch(event.target.value)}
          onFocus={() => {
            if (searchQuery.trim()) setSearchOpen(true)
          }}
          onKeyDown={handleSearchKeyDown}
        />
        {searchQuery ? (
          <button
            type="button"
            className="header-search-clear"
            aria-label="Clear search"
            onClick={clearSearch}
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
        <kbd className="search-shortcut">Ctrl K</kbd>
        {searchOpen ? (
          <div
            className="search-suggestions"
            id="geographic-search-suggestions"
            role="listbox"
            aria-label="Location suggestions"
          >
            {suggestions.length ? (
              <ul role="presentation">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.id} role="presentation">
                    <button
                      id={`search-suggestion-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === highlightedSuggestion}
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(suggestion)}
                    >
                      <span className="search-suggestion-icon">
                        <Icon name={suggestion.icon} size={16} />
                      </span>
                      <span className="search-suggestion-copy">
                        <strong>{suggestion.label}</strong>
                        <small>{suggestion.detail}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="search-suggestions-empty">
                No matching place, coordinates, or saved AOI.
              </p>
            )}
          </div>
        ) : null}
      </form>

      <div className="topbar-meta">
        <button
          type="button"
          className="credits-chip"
          onClick={onOpenAccount}
          aria-label={`Credit balance: ${creditSummary}. Open account and credits.`}
          title={`Credit balance: ${creditSummary}`}
        >
          <Icon name="credit-card" />
          <span className="credits-value">{creditSummary}</span>
        </button>
        <div className="account-menu" ref={accountMenuRef}>
          <button
            ref={accountButtonRef}
            type="button"
            className={
              panel === 'account' || accountOpen
                ? 'account-button account-button-active'
                : 'account-button'
            }
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label="Account menu"
            title="Account menu"
            onClick={onToggleAccount}
          >
            <Icon name="user" />
            <Icon name="chevron-down" size={14} className="account-caret" />
          </button>
          {accountOpen ? (
            <div className="account-dropdown" role="menu" aria-label="Account">
              <div className="account-dropdown-header">
                <span>
                  {account?.displayName ?? (sessionActive ? 'Demo account' : 'Signed out')}
                </span>
                <strong>{sessionActive ? creditSummary : 'No active session'}</strong>
              </div>
              <button type="button" role="menuitem" onClick={onOpenAccount}>
                <Icon name="credit-card" />
                <span>Account and credits</span>
              </button>
              <button type="button" role="menuitem" onClick={onRefreshBalance}>
                <Icon name="refresh" />
                <span>Refresh credit balance</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
