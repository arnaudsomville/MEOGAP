import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Aoi } from '../../../src/api/client'
import { AoiPanel } from '../../../src/components/panels/AoiPanel'
import { AOI } from '../../app/fixtures'

const AOI_VIEW: Aoi = {
  ...AOI,
  id: AOI.aoi_id,
  createdAt: AOI.created_at,
  updatedAt: AOI.updated_at,
}

function renderPanel(overrides: Partial<Parameters<typeof AoiPanel>[0]> = {}) {
  const props: Parameters<typeof AoiPanel>[0] = {
    onClose: vi.fn(),
    loading: false,
    loadError: false,
    onRetry: vi.fn(),
    visibleAois: [AOI_VIEW],
    selectedAoiId: null,
    selectedAoi: null,
    onSelectAoi: vi.fn(),
    onBeginNew: vi.fn(),
    onBeginEdit: vi.fn(),
    aoiQuery: '',
    setAoiQuery: vi.fn(),
    drawing: false,
    editingAoiId: null,
    aoiName: '',
    setAoiName: vi.fn(),
    aoiDescription: '',
    setAoiDescription: vi.fn(),
    draftVerticesCount: 0,
    draftAreaKm2: null,
    draftAreaExceeded: false,
    onUndoPoint: vi.fn(),
    onResetDrawing: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    deleteCandidateId: null,
    setDeleteCandidateId: vi.fn(),
    onRemove: vi.fn(),
    drawingFormRef: createRef<HTMLElement>(),
    ...overrides,
  }
  const view = render(<AoiPanel {...props} />)
  return { ...view, props }
}

describe('AoiPanel', () => {
  it('renders loading, error and empty states', { tags: ['unit'] }, () => {
    const loading = renderPanel({ loading: true })
    expect(screen.getByText('Loading saved AOIs…')).toBeInTheDocument()
    loading.unmount()
    const error = renderPanel({ loadError: true })
    expect(screen.getByText('The AOI library is unavailable.')).toBeInTheDocument()
    error.unmount()
    renderPanel({ visibleAois: [] })
    expect(screen.getByText('No saved AOIs match this search.')).toBeInTheDocument()
  })

  it('selects, filters, creates and edits saved AOIs', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const panel = renderPanel()
    const item = screen.getByText('Toulouse study area').closest('button')
    expect(item).not.toBeNull()
    await user.click(item as HTMLButtonElement)
    expect(panel.props.onSelectAoi).toHaveBeenCalledWith('aoi-1')
    await user.click(screen.getByRole('button', { name: 'Draw new area' }))
    expect(panel.props.onBeginNew).toHaveBeenCalled()
    panel.unmount()

    const selected = renderPanel({ selectedAoiId: 'aoi-1', selectedAoi: AOI_VIEW })
    await user.click(screen.getByRole('button', { name: 'Edit selected' }))
    expect(selected.props.onBeginEdit).toHaveBeenCalledWith(AOI_VIEW)
    await user.click(screen.getByRole('button', { name: 'Delete selected' }))
    expect(selected.props.setDeleteCandidateId).toHaveBeenCalledWith('aoi-1')
    selected.unmount()

    const confirming = renderPanel({
      selectedAoiId: 'aoi-1',
      selectedAoi: AOI_VIEW,
      deleteCandidateId: 'aoi-1',
    })
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(confirming.props.onRemove).toHaveBeenCalledWith('aoi-1')
    await user.click(screen.getByRole('button', { name: 'Keep AOI' }))
    expect(confirming.props.setDeleteCandidateId).toHaveBeenCalledWith(null)
  })

  it('edits the drawing metadata and controls the draft boundary', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const panel = renderPanel({
      drawing: true,
      editingAoiId: 'aoi-1',
      aoiName: 'Toulouse',
      aoiDescription: 'Area',
      draftVerticesCount: 4,
      draftAreaKm2: 12.5,
    })
    expect(screen.getByText('Edit saved area')).toBeInTheDocument()
    expect(screen.getByText(/Area:/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Area name'), ' updated')
    expect(panel.props.setAoiName).toHaveBeenCalled()
    await user.type(screen.getByLabelText('Description'), ' updated')
    expect(panel.props.setAoiDescription).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Undo last point' }))
    await user.click(screen.getByRole('button', { name: 'Reset drawing' }))
    await user.click(screen.getByRole('button', { name: 'Save AOI' }))
    await user.click(screen.getByRole('button', { name: 'Discard drawing' }))
    expect(panel.props.onUndoPoint).toHaveBeenCalled()
    expect(panel.props.onResetDrawing).toHaveBeenCalled()
    expect(panel.props.onSave).toHaveBeenCalled()
    expect(panel.props.onDiscard).toHaveBeenCalled()
  })

  it('shows the area limit and disables saving an invalid draft', { tags: ['unit'] }, () => {
    renderPanel({
      drawing: true,
      draftVerticesCount: 3,
      draftAreaKm2: 250,
      draftAreaExceeded: true,
    })
    expect(screen.getByText(/maximum 100 km²/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save AOI' })).toBeDisabled()
  })
})
