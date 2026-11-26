import { useCallback, useEffect, useState } from 'react'
import {
  getAccount,
  getCreditBalance,
  listAnalysisRequests,
  listAois,
  listProducts,
  type Account,
  type AnalysisRequest,
  type ApiResponse,
  type Aoi,
  type CreditBalance,
  type Product,
} from '../api/client'
import {
  TERMINAL_STATES,
  errorMessage,
  replaceById,
  type LoadErrors,
  type LoadingState,
} from './constants'

type WorkspaceDataOptions = {
  sessionActive: boolean
  pollIntervalMs: number
}

export function useWorkspaceData({ sessionActive, pollIntervalMs }: WorkspaceDataOptions) {
  const [products, setProducts] = useState<Product[]>([])
  const [aois, setAois] = useState<Aoi[]>([])
  const [requests, setRequests] = useState<AnalysisRequest[]>([])
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<LoadingState>({
    catalogue: true,
    aois: true,
    requests: true,
    balance: false,
  })
  const [loadErrors, setLoadErrors] = useState<LoadErrors>({
    catalogue: false,
    aois: false,
    requests: false,
  })

  const receive = useCallback(function receiveResponse<T>(response: ApiResponse<T>): T {
    if (response.isDemo) setIsDemo(true)
    return response.data
  }, [])

  const showError = useCallback((action: string, reason: unknown): void => {
    setError(`${action}: ${errorMessage(reason)}`)
  }, [])

  const loadCatalogue = useCallback(async (): Promise<void> => {
    try {
      setProducts(receive(await listProducts()))
      setLoadErrors((current) => ({ ...current, catalogue: false }))
    } catch (reason) {
      setLoadErrors((current) => ({ ...current, catalogue: true }))
      showError('Catalogue could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, catalogue: false }))
    }
  }, [receive, showError])

  const loadAois = useCallback(async (): Promise<void> => {
    try {
      setAois(receive(await listAois()))
      setLoadErrors((current) => ({ ...current, aois: false }))
    } catch (reason) {
      setLoadErrors((current) => ({ ...current, aois: true }))
      showError('AOI library could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, aois: false }))
    }
  }, [receive, showError])

  const loadRequests = useCallback(async (): Promise<void> => {
    try {
      setRequests(receive(await listAnalysisRequests()))
      setLoadErrors((current) => ({ ...current, requests: false }))
    } catch (reason) {
      setLoadErrors((current) => ({ ...current, requests: true }))
      showError('Requests could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, requests: false }))
    }
  }, [receive, showError])

  const refreshBalance = useCallback(async (): Promise<void> => {
    setIsLoading((current) => ({ ...current, balance: true }))
    try {
      setCreditBalance(receive(await getCreditBalance()))
    } catch (reason) {
      showError('Credit balance could not be loaded', reason)
    } finally {
      setIsLoading((current) => ({ ...current, balance: false }))
    }
  }, [receive, showError])

  const loadAccount = useCallback(async (): Promise<void> => {
    try {
      setAccount(receive(await getAccount()))
    } catch (reason) {
      showError('Account identity could not be loaded', reason)
    }
  }, [receive, showError])

  const upsertRequest = useCallback((nextRequest: AnalysisRequest): void => {
    setRequests((current) => replaceById(current, nextRequest))
  }, [])

  useEffect(() => {
    if (!sessionActive) return
    const timer = window.setTimeout(() => {
      void loadCatalogue()
      void loadAois()
      void loadRequests()
      void refreshBalance()
      void loadAccount()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [sessionActive, loadCatalogue, loadAois, loadRequests, refreshBalance, loadAccount])

  const hasActiveRequests = requests.some((request) => !TERMINAL_STATES.has(request.state))

  useEffect(() => {
    if (!sessionActive || !hasActiveRequests) return
    let active = true
    const timer = window.setInterval(() => {
      void listAnalysisRequests()
        .then((response) => {
          if (active) setRequests(receive(response))
        })
        .catch((reason: unknown) => {
          if (active) showError('Request status could not be refreshed', reason)
        })
    }, pollIntervalMs)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [sessionActive, hasActiveRequests, pollIntervalMs, receive, showError])

  return {
    products,
    aois,
    requests,
    creditBalance,
    account,
    isDemo,
    error,
    isLoading,
    loadErrors,
    receive,
    showError,
    setError,
    setProducts,
    setAois,
    setRequests,
    setAccount,
    setCreditBalance,
    loadCatalogue,
    loadAois,
    loadRequests,
    refreshBalance,
    loadAccount,
    upsertRequest,
  }
}
