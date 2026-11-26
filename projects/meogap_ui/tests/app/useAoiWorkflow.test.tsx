import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAoi,
  deleteAoi,
  getAoi,
  updateAoi,
  type ApiResponse,
  type Aoi,
} from '../../src/api/client'
import { useAoiWorkflow } from '../../src/app/useAoiWorkflow'
import { AOI } from './fixtures'

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>()
  return {
    ...actual,
    createAoi: vi.fn(),
    updateAoi: vi.fn(),
    deleteAoi: vi.fn(),
    getAoi: vi.fn(),
  }
})

const AOI_VIEW: Aoi = {
  ...AOI,
  id: AOI.aoi_id,
  createdAt: AOI.created_at,
  updatedAt: AOI.updated_at,
}
const SMALL_VERTICES = [
  { lat: 43.6, lng: 1.42 },
  { lat: 43.61, lng: 1.43 },
  { lat: 43.62, lng: 1.42 },
]
const LARGE_VERTICES = [
  { lat: 40, lng: 0 },
  { lat: 41, lng: 1 },
  { lat: 40, lng: 2 },
]

function response<T>(data: T): ApiResponse<T> {
  return { data, isDemo: false }
}

function setup() {
  const setAois = vi.fn()
  const focusBounds = vi.fn()
  const onResumeRequest = vi.fn()
  const openAoiPanel = vi.fn()
  const setError = vi.fn()
  const showError = vi.fn()
  const hook = renderHook(() =>
    useAoiWorkflow({
      aois: [AOI_VIEW],
      setAois,
      receive: <T,>(value: ApiResponse<T>) => value.data,
      showError,
      setError,
      focusBounds,
      onResumeRequest,
      openAoiPanel,
    }),
  )
  return { ...hook, setAois, focusBounds, onResumeRequest, openAoiPanel, setError, showError }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAoi).mockResolvedValue(response(AOI_VIEW))
  vi.mocked(createAoi).mockResolvedValue(response(AOI_VIEW))
  vi.mocked(updateAoi).mockResolvedValue(response(AOI_VIEW))
  vi.mocked(deleteAoi).mockResolvedValue({ data: undefined, isDemo: false })
})

describe('useAoiWorkflow', () => {
  it('selects and focuses an AOI', { tags: ['unit'] }, async () => {
    const hook = setup()
    await act(async () => {
      await hook.result.current.selectAoi('aoi-1')
    })
    expect(getAoi).toHaveBeenCalledWith('aoi-1')
    expect(hook.setAois).toHaveBeenCalled()
    expect(hook.focusBounds).toHaveBeenCalled()
    act(() => hook.result.current.focusAoi('aoi-1'))
    expect(hook.focusBounds).toHaveBeenCalledTimes(2)
  })

  it('creates an AOI from a draft and resumes the request form', { tags: ['unit'] }, async () => {
    const hook = setup()
    act(() => hook.result.current.beginNewAoi(true))
    expect(hook.openAoiPanel).toHaveBeenCalled()
    act(() => {
      hook.result.current.setAoiName('New area')
      hook.result.current.setAoiDescription('Description')
      hook.result.current.setDraftVertices(SMALL_VERTICES)
    })
    await act(async () => {
      await hook.result.current.saveAoi()
    })
    expect(createAoi).toHaveBeenCalled()
    expect(hook.onResumeRequest).toHaveBeenCalledWith('aoi-1')
  })

  it('edits and deletes an existing AOI', { tags: ['unit'] }, async () => {
    const hook = setup()
    act(() => hook.result.current.beginEditAoi(AOI_VIEW))
    expect(hook.result.current.editingAoiId).toBe('aoi-1')
    act(() => hook.result.current.setDraftVertices(SMALL_VERTICES))
    await act(async () => {
      await hook.result.current.saveAoi()
    })
    expect(updateAoi).toHaveBeenCalledWith('aoi-1', expect.any(Object))

    await act(async () => {
      await hook.result.current.removeAoi('aoi-1')
    })
    expect(deleteAoi).toHaveBeenCalledWith('aoi-1')
    expect(hook.setAois).toHaveBeenCalled()
  })

  it('rejects invalid and oversized drafts', { tags: ['unit'] }, async () => {
    const hook = setup()
    act(() => hook.result.current.beginNewAoi())
    act(() => hook.result.current.setDraftVertices(SMALL_VERTICES))
    await act(async () => {
      await hook.result.current.saveAoi()
    })
    expect(hook.setError).toHaveBeenCalledWith(expect.stringContaining('needs a name'))

    act(() => {
      hook.result.current.setAoiName('Large area')
      hook.result.current.setDraftVertices(LARGE_VERTICES)
    })
    await act(async () => {
      await hook.result.current.saveAoi()
    })
    expect(hook.setError).toHaveBeenCalledWith(expect.stringContaining('cannot exceed'))
    expect(createAoi).not.toHaveBeenCalled()
  })

  it('reports Gateway errors and resets drafts', { tags: ['unit'] }, async () => {
    vi.mocked(createAoi).mockRejectedValueOnce(new Error('boom'))
    const hook = setup()
    act(() => hook.result.current.beginNewAoi())
    act(() => {
      hook.result.current.setAoiName('New area')
      hook.result.current.setDraftVertices(SMALL_VERTICES)
    })
    await act(async () => {
      await hook.result.current.saveAoi()
    })
    expect(hook.showError).toHaveBeenCalledWith('AOI could not be saved', expect.any(Error))
    act(() => hook.result.current.discardDraft())
    expect(hook.result.current.drawing).toBe(false)
    act(() => hook.result.current.beginNewAoi())
    act(() => hook.result.current.resetDraftBoundary())
    await waitFor(() => expect(hook.result.current.draftVertices).toEqual([]))
  })
})
