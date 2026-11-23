import { useEffect, useRef, type ReactNode } from 'react'

type OverlayPanelProps = {
  title: string
  onClose: () => void
  children: ReactNode
  position?: 'left' | 'right'
}

export function OverlayPanel({ title, onClose, children, position = 'left' }: OverlayPanelProps) {
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
    <aside className={`overlay-panel overlay-panel-${position}`} aria-label={title}>
      <header className="panel-header">
        <h2>{title}</h2>
        <button
          ref={closeButton}
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
        >
          x
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </aside>
  )
}
