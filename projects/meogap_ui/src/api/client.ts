export type Health = {
  status: string
  service: string
  version: string
}

export type ApiError = {
  code: string
  message: string
  service: string
  operation: string
}

export type ApiResponse<T> = {
  data: T
  isDemo: boolean
}

export type Position = {
  lat: number
  lng: number
}

export type PolygonGeometry = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type MultiPolygonGeometry = {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export type AoiGeometry = PolygonGeometry | MultiPolygonGeometry

export type Aoi = {
  id: string
  name: string
  description: string | null
  geometry: AoiGeometry
  revision: number
  createdAt: string
  updatedAt: string
}

export type AoiInput = {
  name: string
  description: string | null
  geometry: AoiGeometry
}

export type ProductPreview = {
  url: string
  alt: string
  attribution: string | null
}

export type Product = {
  id: string
  name: string
  description: string | null
  level: string | null
  category: string | null
  nativeResolution: string | null
  temporalResolution: string | null
  availability: string | null
  validationStatus: string | null
  inputs: string[]
  parameters: string[]
  limitations: string[]
  supportedSources: string[]
  supportedResolutionsM: number[]
  preview: ProductPreview | null
}

export type ProductRequirements = {
  productId: string
  inputs: string[]
  limitations: string[]
  note: string
}

export const ANALYSIS_STATES = [
  'PREPARING',
  'PROPOSED',
  'IN_EXECUTION',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const

export type AnalysisState = (typeof ANALYSIS_STATES)[number]

export type AnalysisRequest = {
  id: string
  state: AnalysisState
  productId: string | null
  aoiId: string | null
  startMonth: string | null
  endMonth: string | null
  requestedSources: string[]
  requestedSpatialResolutionM: number | null
  estimatedCredits: number | null
  actualCredits: number | null
  resultId: string | null
  message: string | null
}

export type AnalysisRequestInput = {
  productId: string
  aoiId: string
  startMonth: string
  endMonth: string
  spatialResolutionM?: number | null
  sources?: string[]
}

export type ResultMap = {
  url: string
  bounds: [Position, Position] | null
}

export const DELIVERY_STATES = ['PREPARING', 'READY', 'FAILED'] as const

export type DeliveryState = (typeof DELIVERY_STATES)[number]

export type Delivery = {
  id: string
  state: DeliveryState
  downloadUrl: string | null
  message: string | null
}

export type CreditBalance = {
  balance: number
  unit: string | null
}

const API_PREFIX = '/api/v1'
const DEMO_HEADER = 'X-MEOGAP-Demo'
const DEMO_BEARER_TOKEN = import.meta.env.VITE_MEOGAP_DEMO_TOKEN ?? 'm0-ui-demo-token'
const HEALTH_KEYS = ['status', 'service', 'version'] as const
const API_ERROR_KEYS = ['code', 'message', 'service', 'operation'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function requireString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string') {
    throw new Error(`Invalid payload: ${key} must be a string`)
  }
  return field
}

function requireStringFrom(value: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    if (typeof value[key] === 'string') return value[key]
  }
  throw new Error(`Invalid payload: expected a string field named ${keys.join(' or ')}`)
}

function optionalStringFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const field = value[key]
    if (typeof field === 'string') return field
    if (field === null || field === undefined) continue
    throw new Error(`Invalid payload: ${key} must be a string or null`)
  }
  return null
}

function optionalNumberFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const field = value[key]
    if (typeof field === 'number' && Number.isFinite(field)) return field
    if (field === null || field === undefined) continue
    throw new Error(`Invalid payload: ${key} must be a finite number or null`)
  }
  return null
}

function optionalStringListFrom(value: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const field = value[key]
    if (field === null || field === undefined) continue
    if (!Array.isArray(field) || field.some((item) => typeof item !== 'string')) {
      throw new Error(`Invalid payload: ${key} must be an array of strings`)
    }
    return field as string[]
  }
  return []
}

function optionalIntegerListFrom(
  value: Record<string, unknown>,
  keys: readonly string[],
): number[] {
  for (const key of keys) {
    const field = value[key]
    if (field === null || field === undefined) continue
    if (!Array.isArray(field) || field.some((item) => !Number.isInteger(item))) {
      throw new Error(`Invalid payload: ${key} must be an array of integers`)
    }
    return field as number[]
  }
  return []
}

function parseProductPreview(value: unknown): ProductPreview | null {
  if (value === null || value === undefined) return null
  const preview = requireRecord(value, 'preview must be an object or null')
  return {
    url: requireString(preview, 'url'),
    alt: requireString(preview, 'alt'),
    attribution: optionalStringFrom(preview, ['attribution']),
  }
}

function requirePositiveInteger(value: Record<string, unknown>, key: string): number {
  const field = value[key]
  if (!Number.isInteger(field) || (field as number) < 1) {
    throw new Error(`Invalid payload: ${key} must be a positive integer`)
  }
  return field as number
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Invalid payload: ${message}`)
  return value
}

function parseCoordinate(value: unknown): number[] {
  if (!Array.isArray(value) || value.length < 2 || value.some((item) => typeof item !== 'number')) {
    throw new Error('Invalid payload: geometry coordinates must contain numeric positions')
  }
  return value as number[]
}

function parsePolygonCoordinates(value: unknown): number[][][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid payload: polygon coordinates must contain at least one ring')
  }
  return value.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error('Invalid payload: polygon rings must contain at least four positions')
    }
    return ring.map(parseCoordinate)
  })
}

function parseMultiPolygonCoordinates(value: unknown): number[][][][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid payload: multipolygon coordinates must contain at least one polygon')
  }
  return value.map(parsePolygonCoordinates)
}

function parseEnvelopeList(value: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value
  const record = requireRecord(
    value,
    `expected an array or an object containing ${keys.join(' or ')}`,
  )
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key]
  }
  throw new Error(`Invalid payload: expected an array field named ${keys.join(' or ')}`)
}

function isDemoResponse(response: Response): boolean {
  return response.headers?.get?.(DEMO_HEADER)?.toLowerCase() === 'true'
}

function withDemoBearer(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${DEMO_BEARER_TOKEN}`,
    },
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error(`API response ${response.status} did not contain JSON`)
  }
}

async function requestJson<T>(
  path: string,
  parser: (payload: unknown) => T,
  init?: RequestInit,
  requiresBearer = true,
): Promise<ApiResponse<T>> {
  const response = await fetch(path, requiresBearer ? withDemoBearer(init) : init)
  const payload = await readJson(response)
  if (!response.ok) {
    try {
      throw new ApiRequestError(parseApiError(payload))
    } catch (error) {
      if (error instanceof ApiRequestError) throw error
    }
    throw new Error(`API request failed with status ${response.status}`)
  }
  return { data: parser(payload), isDemo: isDemoResponse(response) }
}

function jsonRequest(method: 'POST' | 'PATCH', payload: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

function idPathSegment(id: string): string {
  return encodeURIComponent(id)
}

export function parseHealth(payload: unknown): Health {
  if (!isRecord(payload) || !hasExactKeys(payload, HEALTH_KEYS)) {
    throw new Error('Invalid payload: expected exactly status, service and version')
  }
  return {
    status: requireString(payload, 'status'),
    service: requireString(payload, 'service'),
    version: requireString(payload, 'version'),
  }
}

export function parseApiError(payload: unknown): ApiError {
  if (!isRecord(payload) || !hasExactKeys(payload, API_ERROR_KEYS)) {
    throw new Error('Invalid payload: expected exactly code, message, service and operation')
  }
  return {
    code: requireString(payload, 'code'),
    message: requireString(payload, 'message'),
    service: requireString(payload, 'service'),
    operation: requireString(payload, 'operation'),
  }
}

export function parseAoiGeometry(payload: unknown): AoiGeometry {
  const geometry = requireRecord(payload, 'geometry must be an object')
  const type = requireString(geometry, 'type')
  if (type === 'Polygon') {
    return { type, coordinates: parsePolygonCoordinates(geometry.coordinates) }
  }
  if (type === 'MultiPolygon') {
    return { type, coordinates: parseMultiPolygonCoordinates(geometry.coordinates) }
  }
  throw new Error('Invalid payload: geometry type must be Polygon or MultiPolygon')
}

export function parseAoi(payload: unknown): Aoi {
  const aoi = requireRecord(payload, 'AOI must be an object')
  return {
    id: requireStringFrom(aoi, ['aoi_id', 'id']),
    name: requireString(aoi, 'name'),
    description: optionalStringFrom(aoi, ['description']),
    geometry: parseAoiGeometry(aoi.geometry),
    revision: requirePositiveInteger(aoi, 'revision'),
    createdAt: requireString(aoi, 'created_at'),
    updatedAt: requireString(aoi, 'updated_at'),
  }
}

export function parseAoiList(payload: unknown): Aoi[] {
  return parseEnvelopeList(payload, ['items', 'aois']).map(parseAoi)
}

export function parseProduct(payload: unknown): Product {
  const product = requireRecord(payload, 'product must be an object')
  return {
    id: requireStringFrom(product, ['product_id', 'id']),
    name: requireStringFrom(product, ['name', 'title']),
    description: optionalStringFrom(product, ['description', 'summary']),
    level: optionalStringFrom(product, ['level', 'processing_level']),
    category: optionalStringFrom(product, ['category']),
    nativeResolution: optionalStringFrom(product, ['native_resolution']),
    temporalResolution: optionalStringFrom(product, ['temporal_resolution']),
    availability: optionalStringFrom(product, ['availability']),
    validationStatus: optionalStringFrom(product, [
      'validation_status',
      'scientific_validation_status',
    ]),
    inputs: optionalStringListFrom(product, ['inputs']),
    parameters: optionalStringListFrom(product, ['parameters']),
    limitations: optionalStringListFrom(product, ['limitations']),
    supportedSources: optionalStringListFrom(product, ['supported_sources']),
    supportedResolutionsM: optionalIntegerListFrom(product, ['supported_resolutions_m']),
    preview: parseProductPreview(product.preview),
  }
}

export function parseProductList(payload: unknown): Product[] {
  return parseEnvelopeList(payload, ['items', 'products']).map(parseProduct)
}

export function parseProductRequirements(payload: unknown): ProductRequirements {
  const requirements = requireRecord(payload, 'input requirements must be an object')
  return {
    productId: requireStringFrom(requirements, ['product_id', 'id']),
    inputs: optionalStringListFrom(requirements, ['inputs']),
    limitations: optionalStringListFrom(requirements, ['limitations']),
    note: optionalStringFrom(requirements, ['note']) ?? '',
  }
}

export function parseAnalysisRequest(payload: unknown): AnalysisRequest {
  const request = requireRecord(payload, 'analysis request must be an object')
  const state = requireString(request, 'state')
  if (!ANALYSIS_STATES.includes(state as AnalysisState)) {
    throw new Error(`Invalid payload: unsupported analysis request state ${state}`)
  }
  const proposal = isRecord(request.proposal) ? request.proposal : request
  return {
    id: requireStringFrom(request, ['request_id', 'id']),
    state: state as AnalysisState,
    productId: optionalStringFrom(request, ['product_id', 'productId']),
    aoiId: optionalStringFrom(request, ['aoi_id', 'aoiId']),
    startMonth: optionalStringFrom(request, ['start_month', 'period_start']),
    endMonth: optionalStringFrom(request, ['end_month', 'period_end']),
    requestedSources: optionalStringListFrom(request, ['requested_sources', 'sources']),
    requestedSpatialResolutionM: optionalNumberFrom(request, [
      'requested_spatial_resolution_m',
      'spatial_resolution_m',
    ]),
    estimatedCredits: optionalNumberFrom(proposal, ['estimated_credits', 'estimated_cost']),
    actualCredits: optionalNumberFrom(request, ['actual_credits', 'actual_cost']),
    resultId: optionalStringFrom(request, ['result_id']),
    message: optionalStringFrom(request, ['message', 'reason']),
  }
}

export function parseAnalysisRequestList(payload: unknown): AnalysisRequest[] {
  return parseEnvelopeList(payload, ['items', 'requests']).map(parseAnalysisRequest)
}

function parseBounds(value: unknown): [Position, Position] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const positions = value.map((position) => {
    if (!Array.isArray(position) || position.length < 2) return null
    const [lat, lng] = position
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
  })
  return positions[0] && positions[1] ? [positions[0], positions[1]] : null
}

export function parseResultMap(payload: unknown): ResultMap {
  const resultMap = requireRecord(payload, 'result map must be an object')
  return {
    url: requireStringFrom(resultMap, ['url', 'map_url', 'image_url']),
    bounds: parseBounds(resultMap.bounds),
  }
}

export function parseDelivery(payload: unknown): Delivery {
  const delivery = requireRecord(payload, 'delivery must be an object')
  const state = requireString(delivery, 'state')
  if (!DELIVERY_STATES.includes(state as DeliveryState)) {
    throw new Error(`Invalid payload: unsupported delivery state ${state}`)
  }
  return {
    id: requireStringFrom(delivery, ['delivery_id', 'id']),
    state: state as DeliveryState,
    downloadUrl: optionalStringFrom(delivery, ['download_url', 'url']),
    message: optionalStringFrom(delivery, ['message', 'reason']),
  }
}

export function parseCreditBalance(payload: unknown): CreditBalance {
  const balance = requireRecord(payload, 'credit balance must be an object')
  const amount = optionalNumberFrom(balance, ['balance', 'credits'])
  if (amount === null) throw new Error('Invalid payload: balance must be a finite number')
  return { balance: amount, unit: optionalStringFrom(balance, ['unit', 'currency']) }
}

export class ApiRequestError extends Error {
  readonly error: ApiError

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.error = error
  }
}

export function getHealth(): Promise<ApiResponse<Health>> {
  return requestJson(`${API_PREFIX}/health`, parseHealth, undefined, false)
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
  const response = await fetch(
    `${API_PREFIX}/aois/${idPathSegment(id)}`,
    withDemoBearer({ method: 'DELETE' }),
  )
  if (!response.ok) {
    const payload = await readJson(response)
    try {
      throw new ApiRequestError(parseApiError(payload))
    } catch (error) {
      if (error instanceof ApiRequestError) throw error
    }
    throw new Error(`API request failed with status ${response.status}`)
  }
  return { data: undefined, isDemo: isDemoResponse(response) }
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

export function listAnalysisRequests(): Promise<ApiResponse<AnalysisRequest[]>> {
  return requestJson(`${API_PREFIX}/analysis-requests`, parseAnalysisRequestList)
}

export function getAnalysisRequest(id: string): Promise<ApiResponse<AnalysisRequest>> {
  return requestJson(`${API_PREFIX}/analysis-requests/${idPathSegment(id)}`, parseAnalysisRequest)
}

export function createAnalysisRequest(
  input: AnalysisRequestInput,
): Promise<ApiResponse<AnalysisRequest>> {
  return requestJson(
    `${API_PREFIX}/analysis-requests`,
    parseAnalysisRequest,
    jsonRequest('POST', {
      product_id: input.productId,
      aoi_id: input.aoiId,
      period: { start_month: input.startMonth, end_month: input.endMonth },
      ...(input.spatialResolutionM != null
        ? { spatial_resolution_m: input.spatialResolutionM }
        : {}),
      ...(input.sources && input.sources.length > 0 ? { sources: input.sources } : {}),
    }),
  )
}

export function confirmAnalysisRequest(id: string): Promise<ApiResponse<AnalysisRequest>> {
  return requestJson(
    `${API_PREFIX}/analysis-requests/${idPathSegment(id)}/confirm`,
    parseAnalysisRequest,
    jsonRequest('POST', {}),
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

export function getResultMap(id: string): Promise<ApiResponse<ResultMap>> {
  return requestJson(`${API_PREFIX}/results/${idPathSegment(id)}/map`, parseResultMap)
}

export function createDelivery(id: string): Promise<ApiResponse<Delivery>> {
  return requestJson(
    `${API_PREFIX}/results/${idPathSegment(id)}/deliveries`,
    parseDelivery,
    jsonRequest('POST', { kind: 'final_product' }),
  )
}

export function getDelivery(id: string): Promise<ApiResponse<Delivery>> {
  return requestJson(`${API_PREFIX}/deliveries/${idPathSegment(id)}`, parseDelivery)
}
