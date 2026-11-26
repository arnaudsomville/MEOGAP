import { API_PREFIX, idPathSegment, jsonRequest, requestJson, requestNoContent } from './http'
import {
  parseAccount,
  parseAnalysisRequest,
  parseAnalysisRequestList,
  parseAoi,
  parseAoiList,
  parseCostEstimate,
  parseCreditBalance,
  parseDelivery,
  parseHealth,
  parseProduct,
  parseProductList,
  parseProductMissions,
  parsePlaceSuggestionList,
  parseProductRequirements,
  parseResultDetail,
  parseResultMap,
  parseSeries,
} from './parsers'
import type {
  Account,
  AnalysisRequest,
  AnalysisRequestInput,
  ApiResponse,
  Aoi,
  AoiInput,
  CostEstimate,
  CreditBalance,
  Delivery,
  DeliveryKind,
  PlaceSuggestionList,
  Product,
  ProductMissions,
  ProductRequirements,
  ResultDetail,
  ResultMap,
  SeriesRequestInput,
  SeriesResponse,
  Health,
} from './types'

export function getHealth(options: { signal?: AbortSignal } = {}): Promise<ApiResponse<Health>> {
  return requestJson(`${API_PREFIX}/health`, parseHealth, { signal: options.signal }, false)
}

export function listAois(): Promise<ApiResponse<Aoi[]>> {
  return requestJson(`${API_PREFIX}/aois`, parseAoiList)
}

export function getAoi(id: string): Promise<ApiResponse<Aoi>> {
  return requestJson(`${API_PREFIX}/aois/${idPathSegment(id)}`, parseAoi)
}

export function createAoi(input: AoiInput): Promise<ApiResponse<Aoi>> {
  return requestJson(`${API_PREFIX}/aois`, parseAoi, jsonRequest('POST', input))
}

export function updateAoi(id: string, input: AoiInput): Promise<ApiResponse<Aoi>> {
  return requestJson(
    `${API_PREFIX}/aois/${idPathSegment(id)}`,
    parseAoi,
    jsonRequest('PATCH', input),
  )
}

export async function deleteAoi(id: string): Promise<ApiResponse<undefined>> {
  return requestNoContent(`${API_PREFIX}/aois/${idPathSegment(id)}`, { method: 'DELETE' })
}

export function listProducts(): Promise<ApiResponse<Product[]>> {
  return requestJson(`${API_PREFIX}/catalogue/products`, parseProductList)
}

export function getProduct(id: string): Promise<ApiResponse<Product>> {
  return requestJson(`${API_PREFIX}/catalogue/products/${idPathSegment(id)}`, parseProduct)
}

export function getProductRequirements(id: string): Promise<ApiResponse<ProductRequirements>> {
  return requestJson(
    `${API_PREFIX}/catalogue/products/${idPathSegment(id)}/input-requirements`,
    parseProductRequirements,
  )
}

export function getPlaceSuggestions(
  input: {
    query?: string
    lat?: number | null
    lng?: number | null
    limit?: number
  } = {},
): Promise<ApiResponse<PlaceSuggestionList>> {
  const params = new URLSearchParams()
  if (input.query?.trim()) params.set('q', input.query.trim())
  if (input.lat != null && input.lng != null) {
    params.set('lat', String(input.lat))
    params.set('lng', String(input.lng))
  }
  if (input.limit != null) params.set('limit', String(input.limit))
  const suffix = params.toString()
  return requestJson(
    `${API_PREFIX}/places/suggestions${suffix ? `?${suffix}` : ''}`,
    parsePlaceSuggestionList,
  )
}

export function getProductMissions(id: string): Promise<ApiResponse<ProductMissions>> {
  return requestJson(
    `${API_PREFIX}/catalogue/products/${idPathSegment(id)}/missions`,
    parseProductMissions,
  )
}

export function listAnalysisRequests(): Promise<ApiResponse<AnalysisRequest[]>> {
  return requestJson(`${API_PREFIX}/analysis-requests`, parseAnalysisRequestList)
}

export function getAnalysisRequest(id: string): Promise<ApiResponse<AnalysisRequest>> {
  return requestJson(`${API_PREFIX}/analysis-requests/${idPathSegment(id)}`, parseAnalysisRequest)
}

function analysisRequestPayload(input: AnalysisRequestInput): Record<string, unknown> {
  return {
    product_id: input.productId,
    aoi_id: input.aoiId,
    period: { start_month: input.startMonth, end_month: input.endMonth },
    ...(input.spatialResolutionM != null ? { spatial_resolution_m: input.spatialResolutionM } : {}),
    ...(input.sources && input.sources.length > 0 ? { sources: input.sources } : {}),
    ...(input.temporalFrequency ? { temporal_frequency: input.temporalFrequency } : {}),
  }
}

export function createAnalysisRequest(
  input: AnalysisRequestInput,
): Promise<ApiResponse<AnalysisRequest>> {
  return requestJson(
    `${API_PREFIX}/analysis-requests`,
    parseAnalysisRequest,
    jsonRequest('POST', analysisRequestPayload(input)),
  )
}

export function estimateAnalysisRequest(
  input: AnalysisRequestInput,
): Promise<ApiResponse<CostEstimate>> {
  return requestJson(
    `${API_PREFIX}/analysis-requests/estimate`,
    parseCostEstimate,
    jsonRequest('POST', analysisRequestPayload(input)),
  )
}

export function cancelAnalysisRequest(id: string): Promise<ApiResponse<AnalysisRequest>> {
  return requestJson(
    `${API_PREFIX}/analysis-requests/${idPathSegment(id)}/cancel`,
    parseAnalysisRequest,
    jsonRequest('POST', {}),
  )
}

export function getCreditBalance(): Promise<ApiResponse<CreditBalance>> {
  return requestJson(`${API_PREFIX}/credits/balance`, parseCreditBalance)
}

export function getResultMap(id: string, frames?: number): Promise<ApiResponse<ResultMap>> {
  const query = frames == null ? '' : `?frames=${encodeURIComponent(frames)}`
  return requestJson(`${API_PREFIX}/results/${idPathSegment(id)}/map${query}`, parseResultMap)
}

export function getResult(id: string): Promise<ApiResponse<ResultDetail>> {
  return requestJson(`${API_PREFIX}/results/${idPathSegment(id)}`, parseResultDetail)
}

export function queryResultSeries(
  resultId: string,
  input: SeriesRequestInput,
): Promise<ApiResponse<SeriesResponse>> {
  return requestJson(
    `${API_PREFIX}/results/${idPathSegment(resultId)}/series`,
    parseSeries,
    jsonRequest('POST', {
      geometry_wkt: input.geometryWkt,
      crs: input.crs,
      period: { start_month: input.startMonth, end_month: input.endMonth },
      ...(input.parameters && input.parameters.length > 0 ? { parameters: input.parameters } : {}),
    }),
  )
}

export function createDelivery(
  id: string,
  kind: DeliveryKind = 'final_product',
): Promise<ApiResponse<Delivery>> {
  return requestJson(
    `${API_PREFIX}/results/${idPathSegment(id)}/deliveries`,
    parseDelivery,
    jsonRequest('POST', { kind }),
  )
}

export function getAccount(): Promise<ApiResponse<Account>> {
  return requestJson(`${API_PREFIX}/account`, parseAccount)
}

export function getDelivery(id: string): Promise<ApiResponse<Delivery>> {
  return requestJson(`${API_PREFIX}/deliveries/${idPathSegment(id)}`, parseDelivery)
}
