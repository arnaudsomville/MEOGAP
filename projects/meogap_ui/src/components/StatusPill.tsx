export function StatusPill({ state }: { state: string }) {
  return (
    <span className={`status-pill status-${state.toLowerCase()}`}>
      {state.replaceAll('_', ' ')}
    </span>
  )
}
