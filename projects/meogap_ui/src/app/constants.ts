import type { AnalysisState, TemporalFrequency } from '../api/client'

export type Panel = 'catalogue' | 'aois' | 'requests' | 'indicators' | 'account' | 'request' | null

export type AppProps = {
  MapSurface?: import('../map/LeafletMapSurface').MapSurfaceComponent
  pollIntervalMs?: number
}

export type LoadingState = {
  catalogue: boolean
  aois: boolean
  requests: boolean
  balance: boolean
}

export type LoadErrors = {
  catalogue: boolean
  aois: boolean
  requests: boolean
}

export const INITIAL_AOI_NAME = ''
export const EMPTY_DESCRIPTION = ''
export const EMPTY_MONTH = ''
export const DEFAULT_POLL_INTERVAL_MS = 5000
export const PANEL_RESERVE_PX = 480
export const MAP_TOOL_RESERVE_PX = 112
export const TOP_RESERVE_PX = 96
export const INSPECTOR_COLLAPSED_RESERVE_PX = 140
export const INSPECTOR_EXPANDED_RESERVE_PX = 210
export const NARROW_LAYOUT_MAX_WIDTH_PX = 1000
export const SELECTION_CRS = 'EPSG:4326'
export const MAX_SELECTION_AREA_KM2 = 25_000
export const TERMINAL_STATES: ReadonlySet<AnalysisState> = new Set([
  'succeeded',
  'failed',
  'cancelled',
])

export const TEMPORAL_FREQUENCY_LABELS: Record<TemporalFrequency, string> = {
  monthly: 'Monthly',
  semimonthly: 'Semi-monthly',
  weekly: 'Weekly',
  three_day: '3-day',
  two_day: '2-day',
  daily: '1-day',
}

export function temporalFrequencyLabel(frequency: TemporalFrequency | null): string {
  return frequency ? TEMPORAL_FREQUENCY_LABELS[frequency] : 'Not specified'
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

export function replaceById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const index = items.findIndex((item) => item.id === nextItem.id)
  if (index === -1) return [nextItem, ...items]
  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}
