import { useEffect, useRef, type ReactNode } from 'react'

type OverlayPanelProps = {
  title: string
  onClose: () => void
  children: ReactNode
  icon?: ReactNode
}

export function OverlayPanel({ title, onClose, children, icon }: OverlayPanelProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  return (
    <aside className="overlay-panel" aria-label={title} data-side="right">
      <header className="panel-header">
        <div className="panel-title">
          {icon ? <span className="panel-title-icon">{icon}</span> : null}
          <h2>{title}</h2>
        </div>
        <button
          ref={closeButton}
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          title={`Close ${title}`}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </aside>
  )
}
