import { useEffect, useRef, useState } from 'react'
import {
  createAoi,
  deleteAoi,
  getAoi,
  updateAoi,
  type Aoi,
  type ApiResponse,
  type Position,
} from '../api/client'
import { AOI_AREA_LIMIT_MESSAGE, AOI_MAX_AREA_KM2 } from '../config'
import {
  formatAreaKm2,
  geometryAreaKm2,
  geometryBounds,
  geometryToVertices,
  verticesAreaKm2,
  verticesToPolygon,
  type MapBounds,
} from '../map/coordinates'
import { EMPTY_DESCRIPTION, INITIAL_AOI_NAME, replaceById } from './constants'

type FocusBounds = (
  bounds: MapBounds,
  options?: { reserveRightPanel?: boolean; reserveInspector?: boolean },
) => void

type AoiWorkflowOptions = {
  aois: Aoi[]
  setAois: (updater: (current: Aoi[]) => Aoi[]) => void
  receive: <T>(response: ApiResponse<T>) => T
  showError: (action: string, reason: unknown) => void
  setError: (message: string | null) => void
  focusBounds: FocusBounds
  onResumeRequest: (aoiId: string) => void
  openAoiPanel: () => void
}

export function useAoiWorkflow({
  aois,
  setAois,
  receive,
  showError,
  setError,
  focusBounds,
  onResumeRequest,
  openAoiPanel,
}: AoiWorkflowOptions) {
  const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null)
  const [aoiQuery, setAoiQuery] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [editingAoiId, setEditingAoiId] = useState<string | null>(null)
  const [resumeRequestAfterAoi, setResumeRequestAfterAoi] = useState(false)
  const [aoiName, setAoiName] = useState(INITIAL_AOI_NAME)
  const [aoiDescription, setAoiDescription] = useState(EMPTY_DESCRIPTION)
  const [draftVertices, setDraftVertices] = useState<Position[]>([])
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
  const drawingFormRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!drawing) return
    const node = drawingFormRef.current
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [drawing])

  async function selectAoi(
    id: string,
    options: { reserveRightPanel?: boolean } = {},
  ): Promise<void> {
    setSelectedAoiId(id)
    try {
      const response = await getAoi(id)
      const aoi = receive(response)
      setAois((current) => replaceById(current, aoi))
      const bounds = geometryBounds(aoi.geometry)
      if (bounds) focusBounds(bounds, { reserveRightPanel: options.reserveRightPanel })
    } catch (reason) {
      showError('AOI details could not be loaded', reason)
    }
  }

  function focusAoi(id: string): void {
    const aoi = aois.find((item) => item.id === id)
    if (!aoi) return
    const bounds = geometryBounds(aoi.geometry)
    if (bounds) focusBounds(bounds, { reserveRightPanel: true })
  }

  function beginNewAoi(resumeRequest = false): void {
    setEditingAoiId(null)
    setAoiName(INITIAL_AOI_NAME)
    setAoiDescription(EMPTY_DESCRIPTION)
    setDraftVertices([])
    setDrawing(true)
    setDeleteCandidateId(null)
    setResumeRequestAfterAoi(resumeRequest)
    openAoiPanel()
  }

  function beginEditAoi(aoi: Aoi): void {
    setEditingAoiId(aoi.id)
    setAoiName(aoi.name)
    setAoiDescription(aoi.description ?? EMPTY_DESCRIPTION)
    setDraftVertices(geometryToVertices(aoi.geometry))
    setDrawing(true)
    setDeleteCandidateId(null)
  }

  function discardDraft(): void {
    setEditingAoiId(null)
    setAoiName(INITIAL_AOI_NAME)
    setAoiDescription(EMPTY_DESCRIPTION)
    setDraftVertices([])
    setDrawing(false)
    setResumeRequestAfterAoi(false)
  }

  function resetDraftBoundary(): void {
    setDraftVertices([])
  }

  async function saveAoi(): Promise<void> {
    const name = aoiName.trim()
    const geometry = verticesToPolygon(draftVertices)
    if (!name || !geometry) {
      setError('An AOI needs a name and at least three boundary points before it can be saved.')
      return
    }
    const areaKm2 = geometryAreaKm2(geometry)
    if (areaKm2 > AOI_MAX_AREA_KM2) {
      setError(`${AOI_AREA_LIMIT_MESSAGE} Current area: ${formatAreaKm2(areaKm2)}.`)
      return
    }
    try {
      const input = { name, description: aoiDescription.trim() || null, geometry }
      const response = editingAoiId ? await updateAoi(editingAoiId, input) : await createAoi(input)
      const aoi = receive(response)
      const resumeRequest = resumeRequestAfterAoi
      setAois((current) => replaceById(current, aoi))
      setSelectedAoiId(aoi.id)
      discardDraft()
      const bounds = geometryBounds(aoi.geometry)
      if (bounds) focusBounds(bounds)
      if (resumeRequest) onResumeRequest(aoi.id)
    } catch (reason) {
      showError('AOI could not be saved', reason)
    }
  }

  async function removeAoi(id: string): Promise<void> {
    try {
      receive(await deleteAoi(id))
      setAois((current) => current.filter((aoi) => aoi.id !== id))
      if (selectedAoiId === id) setSelectedAoiId(null)
      if (editingAoiId === id) discardDraft()
      setDeleteCandidateId(null)
    } catch (reason) {
      showError('AOI could not be deleted', reason)
    }
  }

  const selectedAoi = aois.find((aoi) => aoi.id === selectedAoiId) ?? null
  const visibleAois = aois.filter((aoi) => aoi.name.toLowerCase().includes(aoiQuery.toLowerCase()))
  const draftAreaKm2 = verticesAreaKm2(draftVertices)
  const draftAreaExceeded = draftAreaKm2 !== null && draftAreaKm2 > AOI_MAX_AREA_KM2

  return {
    selectedAoiId,
    setSelectedAoiId,
    selectedAoi,
    visibleAois,
    aoiQuery,
    setAoiQuery,
    drawing,
    editingAoiId,
    aoiName,
    setAoiName,
    aoiDescription,
    setAoiDescription,
    draftVertices,
    setDraftVertices,
    deleteCandidateId,
    setDeleteCandidateId,
    drawingFormRef,
    draftAreaKm2,
    draftAreaExceeded,
    selectAoi,
    focusAoi,
    beginNewAoi,
    beginEditAoi,
    discardDraft,
    resetDraftBoundary,
    saveAoi,
    removeAoi,
  }
}
