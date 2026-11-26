import { useEffect, useState } from 'react'
import {
  createAnalysisRequest,
  estimateAnalysisRequest,
  getProductMissions,
  type AnalysisRequest,
  type ApiResponse,
  type CostEstimate,
  type Product,
  type SourceMissionInfo,
  type TemporalFrequency,
} from '../api/client'
import { EMPTY_MONTH, TEMPORAL_FREQUENCY_LABELS, errorMessage } from './constants'

type RequestComposerOptions = {
  products: Product[]
  sessionActive: boolean
  panel: string | null
  receive: <T>(response: ApiResponse<T>) => T
  showError: (action: string, reason: unknown) => void
  setError: (message: string | null) => void
  setPanel: (panel: 'request' | 'requests') => void
  upsertRequest: (request: AnalysisRequest) => void
  focusAoi: (aoiId: string) => void
}

export function useRequestComposer({
  products,
  sessionActive,
  panel,
  receive,
  showError,
  setError,
  setPanel,
  upsertRequest,
  focusAoi,
}: RequestComposerOptions) {
  const [requestProductId, setRequestProductId] = useState('')
  const [requestAoiId, setRequestAoiId] = useState('')
  const [requestSources, setRequestSources] = useState<string[]>([])
  const [requestResolution, setRequestResolution] = useState('')
  const [requestFrequency, setRequestFrequency] = useState<TemporalFrequency | ''>('')
  const [startMonth, setStartMonth] = useState(EMPTY_MONTH)
  const [endMonth, setEndMonth] = useState(EMPTY_MONTH)
  const [missions, setMissions] = useState<SourceMissionInfo[]>([])
  const [missionsProductId, setMissionsProductId] = useState<string | null>(null)
  const [missionsLoading, setMissionsLoading] = useState(false)
  const [missionsError, setMissionsError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<CostEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  const requestProduct = products.find((product) => product.id === requestProductId) ?? null
  const requestFrequencyOptions = requestProduct?.supportedFrequencies ?? []
  const allMissionsSelected = missions.length > 0 && requestSources.length === missions.length

  useEffect(() => {
    if (!sessionActive || panel !== 'request') return
    if (!requestProductId || !requestAoiId || !startMonth || !endMonth || startMonth > endMonth) {
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return
      setEstimating(true)
      setEstimateError(null)
      const everyMissionSelected =
        missions.length > 0 &&
        requestSources.length === missions.map((mission) => mission.id).length
      void estimateAnalysisRequest({
        productId: requestProductId,
        aoiId: requestAoiId,
        startMonth,
        endMonth,
        spatialResolutionM: requestResolution ? Number(requestResolution) : null,
        sources: everyMissionSelected ? [] : requestSources,
        temporalFrequency: requestFrequency || null,
      })
        .then((response) => {
          if (active) setEstimate(receive(response))
        })
        .catch((reason: unknown) => {
          if (active) {
            setEstimate(null)
            setEstimateError(errorMessage(reason))
          }
        })
        .finally(() => {
          if (active) setEstimating(false)
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [
    sessionActive,
    panel,
    requestProductId,
    requestAoiId,
    startMonth,
    endMonth,
    requestResolution,
    requestSources,
    requestFrequency,
    missions,
    receive,
  ])

  async function loadMissions(
    productId: string,
    options: { selectAll?: boolean } = {},
  ): Promise<void> {
    setMissionsLoading(true)
    setMissionsError(null)
    try {
      const response = receive(await getProductMissions(productId))
      setMissions(response.items)
      setMissionsProductId(response.productId)
      if (options.selectAll) setRequestSources(response.items.map((mission) => mission.id))
    } catch (reason) {
      setMissions([])
      setMissionsProductId(productId)
      setMissionsError(errorMessage(reason))
    } finally {
      setMissionsLoading(false)
    }
  }

  function openRequest(productId: string): void {
    setRequestProductId(productId)
    setRequestAoiId('')
    setRequestSources([])
    setRequestResolution('')
    setRequestFrequency('')
    setStartMonth(EMPTY_MONTH)
    setEndMonth(EMPTY_MONTH)
    setEstimate(null)
    setEstimateError(null)
    setMissions([])
    setMissionsProductId(null)
    if (productId) void loadMissions(productId, { selectAll: true })
    setPanel('request')
  }

  function changeRequestProduct(productId: string): void {
    setRequestProductId(productId)
    setRequestSources([])
    setRequestResolution('')
    setRequestFrequency('')
    setEstimate(null)
    setEstimateError(null)
    setMissions([])
    setMissionsProductId(null)
    if (productId) void loadMissions(productId, { selectAll: true })
  }

  function selectRequestAoi(aoiId: string): void {
    setRequestAoiId(aoiId)
    setEstimate(null)
    setEstimateError(null)
    if (aoiId) focusAoi(aoiId)
  }

  function toggleRequestSource(source: string): void {
    setRequestSources((current) =>
      current.includes(source) ? current.filter((item) => item !== source) : [...current, source],
    )
    setEstimate(null)
  }

  function selectAllRequestSources(): void {
    setRequestSources(missions.map((mission) => mission.id))
    setEstimate(null)
  }

  async function submitRequest(): Promise<void> {
    if (!requestProductId || !requestAoiId || !startMonth || !endMonth) {
      setError('Select a product, an AOI, and inclusive start and end months before submitting.')
      return
    }
    if (startMonth > endMonth) {
      setError('The start month must be on or before the end month.')
      return
    }
    if (missions.length > 0 && requestSources.length === 0) {
      setError('Select at least one compatible source mission.')
      return
    }
    if (requestFrequencyOptions.length && !requestFrequency) {
      setError('Select a temporal frequency declared by the product.')
      return
    }
    if (estimate?.admission === 'INSUFFICIENT_CREDITS') {
      setError('The current credit balance cannot admit this request.')
      return
    }
    if (estimate?.admission === 'UNAVAILABLE') {
      setError('The credit balance is unavailable, so admission cannot be decided.')
      return
    }
    const resolution = requestResolution ? Number(requestResolution) : null
    const everyMissionSelected =
      missions.length > 0 && requestSources.length === missions.map((mission) => mission.id).length
    try {
      const request = receive(
        await createAnalysisRequest({
          productId: requestProductId,
          aoiId: requestAoiId,
          startMonth,
          endMonth,
          spatialResolutionM: resolution,
          sources: everyMissionSelected ? [] : requestSources,
          temporalFrequency: requestFrequency || null,
        }),
      )
      upsertRequest(request)
      setEstimate(null)
      setPanel('requests')
    } catch (reason) {
      showError('Analysis request could not be submitted', reason)
    }
  }

  const canSubmit =
    Boolean(requestProductId && requestAoiId && startMonth && endMonth) &&
    startMonth <= endMonth &&
    (missions.length === 0 || requestSources.length > 0) &&
    Boolean(requestProduct) &&
    requestFrequencyOptions.length > 0 &&
    Boolean(requestFrequency) &&
    estimate?.admission !== 'INSUFFICIENT_CREDITS' &&
    estimate?.admission !== 'UNAVAILABLE'

  const admissionLabel = estimate
    ? estimate.admission === 'ADMITTED'
      ? 'Admitted'
      : estimate.admission === 'INSUFFICIENT_CREDITS'
        ? 'Insufficient credits'
        : 'Balance unavailable'
    : null

  return {
    requestProductId,
    requestAoiId,
    requestSources,
    requestResolution,
    setRequestResolution,
    requestFrequency,
    setRequestFrequency,
    startMonth,
    setStartMonth,
    endMonth,
    setEndMonth,
    missions,
    missionsProductId,
    missionsLoading,
    missionsError,
    estimate,
    estimating,
    estimateError,
    requestProduct,
    allMissionsSelected,
    requestFrequencyOptions,
    admissionLabel,
    canSubmit,
    frequencyLabel: (frequency: TemporalFrequency) => TEMPORAL_FREQUENCY_LABELS[frequency],
    openRequest,
    changeRequestProduct,
    selectRequestAoi,
    toggleRequestSource,
    selectAllRequestSources,
    submitRequest,
    loadMissions,
    clearEstimate: () => {
      setEstimate(null)
      setEstimateError(null)
    },
  }
}
