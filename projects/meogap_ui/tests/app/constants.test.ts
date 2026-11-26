import { describe, expect, it } from 'vitest'
import {
  TEMPORAL_FREQUENCY_LABELS,
  TERMINAL_STATES,
  errorMessage,
  replaceById,
  temporalFrequencyLabel,
} from '../../src/app/constants'

describe('workspace constants', () => {
  it('formats temporal frequency labels and unknown values', { tags: ['unit'] }, () => {
    expect(temporalFrequencyLabel('monthly')).toBe('Monthly')
    expect(temporalFrequencyLabel(null)).toBe('Not specified')
    expect(Object.keys(TEMPORAL_FREQUENCY_LABELS)).toHaveLength(6)
  })

  it('extracts error messages from unknown values', { tags: ['unit'] }, () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('boom')).toBe('The request could not be completed.')
    expect(errorMessage(undefined)).toBe('The request could not be completed.')
  })

  it('replaces existing items and prepends new ones', { tags: ['unit'] }, () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]
    expect(replaceById(items, { id: 'b', value: 3 })).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 3 },
    ])
    expect(replaceById(items, { id: 'c', value: 4 })[0]).toEqual({ id: 'c', value: 4 })
  })

  it('defines the terminal request states', { tags: ['unit'] }, () => {
    expect(TERMINAL_STATES.has('succeeded')).toBe(true)
    expect(TERMINAL_STATES.has('failed')).toBe(true)
    expect(TERMINAL_STATES.has('cancelled')).toBe(true)
    expect(TERMINAL_STATES.has('queued')).toBe(false)
    expect(TERMINAL_STATES.has('processing')).toBe(false)
  })
})
