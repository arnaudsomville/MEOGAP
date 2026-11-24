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

export type SpatialInputType = 'AOI' | 'POI' | 'LOI'
export type TemporalFrequency =
  'monthly' | 'semimonthly' | 'weekly' | 'three_day' | 'two_day' | 'daily'

export type Product = {
  id: string
  name: string
  description: string | null
  level: string | null
  category: string | null
  nativeResolution: string | null
  temporalResolution: string | null
  units: string | null
  availability: string | null
  validationStatus: string | null
  documentationStatus: string | null
  documentationUrl: string | null
  maxPeriodMonths: number | null
  inputs: string[]
  parameters: string[]
  limitations: string[]
  supportedSources: string[]
  supportedResolutionsM: number[]
  supportedSpatialInputs: SpatialInputType[]
  supportedFrequencies: TemporalFrequency[]
  preview: ProductPreview | null
}

export type SourceMissionInfo = {
  id: string
  name: string
  provider: string
  instrument: string
  nativeResolution: string
  temporalResolution: string
  availability: string
}

export type ProductMissions = {
  productId: string
  items: SourceMissionInfo[]
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
  aoiName: string | null
  sourceAoiRevision: number | null
  geometrySnapshot: AoiGeometry | null
  startMonth: string | null
  endMonth: string | null
  requestedSources: string[]
  requestedSpatialResolutionM: number | null
  temporalFrequency: TemporalFrequency | null
  estimatedCredits: number | null
  actualCredits: number | null
  resultId: string | null
  message: string | null
  failureStage: string | null
}

export type AnalysisRequestInput = {
  productId: string
  aoiId: string
  startMonth: string
  endMonth: string
  spatialResolutionM?: number | null
  sources?: string[]
  temporalFrequency?: TemporalFrequency | null
}

export type CostAdmission = 'ADMITTED' | 'INSUFFICIENT_CREDITS' | 'UNAVAILABLE'

export type CostEstimate = {
  productId: string
  aoiId: string
  startMonth: string
  endMonth: string
  feasible: boolean
  estimatedCredits: number
  currency: string
  balance: number | null
  balanceAvailable: boolean
  admission: CostAdmission
  conditions: string[]
  limitations: string[]
}

export type ResultMap = {
  url: string
  bounds: [Position, Position] | null
  requestId: string | null
  productId: string | null
  resultVersion: string | null
  units: string | null
  validationStatus: string | null
  qualityStatus: string | null
  qualityNote: string | null
  isDemo: boolean
}

export type ResultDetail = {
  id: string
  requestId: string
  productId: string
  productName: string
  resultVersion: string
  aoiName: string
  geometry: AoiGeometry
  startMonth: string
  endMonth: string
  units: string
  temporalFrequency: TemporalFrequency | null
  validationStatus: string
  qualityStatus: string
  qualityNote: string
  provenanceNote: string
  isDemo: boolean
}

export const SERIES_STATES = ['VALID', 'MISSING', 'MASKED', 'INVALID'] as const

export type SeriesState = (typeof SERIES_STATES)[number]

export type SeriesPoint = {
  periodStart: string
  periodEnd: string
  value: number | null
  unit: string
  state: SeriesState
  qualityStatus: string
  coverage: number | null
  note: string | null
}

export type SeriesSelectionType = 'Point' | 'Polygon'

export type SeriesResponse = {
  resultId: string
  productId: string
  geometryWkt: string
  crs: string
  selectionType: SeriesSelectionType
  aggregationMethod: string
  units: string
  qualityStatus: string
  qualityNote: string
  coverage: number | null
  isDemo: boolean
  note: string
  points: SeriesPoint[]
}

export type SeriesRequestInput = {
  geometryWkt: string
  crs: string
  startMonth: string
  endMonth: string
  parameters?: string[]
}

export const DELIVERY_STATES = ['PREPARING', 'READY', 'FAILED'] as const

export type DeliveryState = (typeof DELIVERY_STATES)[number]

export type DeliveryKind = 'final_product' | 'dependency_archive'

export type Delivery = {
  id: string
  kind: DeliveryKind | null
  state: DeliveryState
  downloadUrl: string | null
  message: string | null
}

export type CreditBalance = {
  balance: number
  unit: string | null
}

export type Account = {
  userId: string
  displayName: string
  sessionStatus: string
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

const SPATIAL_INPUT_TYPES: readonly SpatialInputType[] = ['AOI', 'POI', 'LOI']
const TEMPORAL_FREQUENCIES: readonly TemporalFrequency[] = [
  'monthly',
  'semimonthly',
  'weekly',
  'three_day',
  'two_day',
  'daily',
]

function optionalSpatialInputList(value: Record<string, unknown>, key: string): SpatialInputType[] {
  return optionalStringListFrom(value, [key]).filter((item): item is SpatialInputType =>
    SPATIAL_INPUT_TYPES.includes(item as SpatialInputType),
  )
}

function optionalFrequencyList(value: Record<string, unknown>, key: string): TemporalFrequency[] {
  return optionalStringListFrom(value, [key]).filter((item): item is TemporalFrequency =>
    TEMPORAL_FREQUENCIES.includes(item as TemporalFrequency),
  )
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
    units: optionalStringFrom(product, ['units']),
    availability: optionalStringFrom(product, ['availability']),
    validationStatus: optionalStringFrom(product, [
      'validation_status',
      'scientific_validation_status',
    ]),
    documentationStatus: optionalStringFrom(product, ['documentation_status']),
    documentationUrl: optionalStringFrom(product, ['documentation_url']),
    maxPeriodMonths: optionalNumberFrom(product, ['max_period_months']),
    inputs: optionalStringListFrom(product, ['inputs']),
    parameters: optionalStringListFrom(product, ['parameters']),
    limitations: optionalStringListFrom(product, ['limitations']),
    supportedSources: optionalStringListFrom(product, ['supported_sources']),
    supportedResolutionsM: optionalIntegerListFrom(product, ['supported_resolutions_m']),
    supportedSpatialInputs: optionalSpatialInputList(product, 'supported_spatial_inputs'),
    supportedFrequencies: optionalFrequencyList(product, 'supported_frequencies'),
    preview: parseProductPreview(product.preview),
  }
}

export function parseProductMissions(payload: unknown): ProductMissions {
  const record = requireRecord(payload, 'product missions must be an object')
  const items = parseEnvelopeList(payload, ['items']).map((item) => {
    const mission = requireRecord(item, 'mission must be an object')
    return {
      id: requireStringFrom(mission, ['source_id', 'id']),
      name: requireString(mission, 'name'),
      provider: requireString(mission, 'provider'),
      instrument: requireString(mission, 'instrument'),
      nativeResolution: requireString(mission, 'native_resolution'),
      temporalResolution: requireString(mission, 'temporal_resolution'),
      availability: requireString(mission, 'availability'),
    }
  })
  return {
    productId: requireStringFrom(record, ['product_id', 'id']),
    items,
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

function parseTemporalFrequency(value: unknown): TemporalFrequency | null {
  if (value === null || value === undefined) return null
  if (value === 'monthly' || value === 'semimonthly' || value === 'weekly') return value
  if (value === 'three_day' || value === 'two_day' || value === 'daily') return value
  throw new Error('Invalid payload: unsupported temporal_frequency')
}

export function parseAnalysisRequest(payload: unknown): AnalysisRequest {
  const request = requireRecord(payload, 'analysis request must be an object')
  const state = requireString(request, 'state')
  if (!ANALYSIS_STATES.includes(state as AnalysisState)) {
    throw new Error(`Invalid payload: unsupported analysis request state ${state}`)
  }
  const proposal = isRecord(request.proposal) ? request.proposal : request
  const failure = isRecord(request.failure) ? request.failure : null
  const geometry = request.geometry_snapshot
  return {
    id: requireStringFrom(request, ['request_id', 'id']),
    state: state as AnalysisState,
    productId: optionalStringFrom(request, ['product_id', 'productId']),
    aoiId: optionalStringFrom(request, ['aoi_id', 'aoiId']),
    aoiName: optionalStringFrom(request, ['aoi_name']),
    sourceAoiRevision: optionalNumberFrom(request, ['source_aoi_revision']),
    geometrySnapshot: geometry == null ? null : parseAoiGeometry(geometry),
    startMonth: optionalStringFrom(request, ['start_month', 'period_start']),
    endMonth: optionalStringFrom(request, ['end_month', 'period_end']),
    requestedSources: optionalStringListFrom(request, ['requested_sources', 'sources']),
    requestedSpatialResolutionM: optionalNumberFrom(request, [
      'requested_spatial_resolution_m',
      'spatial_resolution_m',
    ]),
    temporalFrequency: parseTemporalFrequency(request.temporal_frequency),
    estimatedCredits: optionalNumberFrom(proposal, ['estimated_credits', 'estimated_cost']),
    actualCredits: optionalNumberFrom(request, ['actual_credits', 'actual_cost']),
    resultId: optionalStringFrom(request, ['result_id']),
    message: optionalStringFrom(request, ['message', 'reason']),
    failureStage: failure ? optionalStringFrom(failure, ['stage']) : null,
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
    requestId: optionalStringFrom(resultMap, ['request_id']),
    productId: optionalStringFrom(resultMap, ['product_id']),
    resultVersion: optionalStringFrom(resultMap, ['result_version']),
    units: optionalStringFrom(resultMap, ['units']),
    validationStatus: optionalStringFrom(resultMap, ['validation_status']),
    qualityStatus: optionalStringFrom(resultMap, ['quality_status']),
    qualityNote: optionalStringFrom(resultMap, ['quality_note']),
    isDemo: resultMap.is_demo === true,
  }
}

export function parseResultDetail(payload: unknown): ResultDetail {
  const result = requireRecord(payload, 'result must be an object')
  return {
    id: requireStringFrom(result, ['result_id', 'id']),
    requestId: requireString(result, 'request_id'),
    productId: requireString(result, 'product_id'),
    productName: requireString(result, 'product_name'),
    resultVersion: requireString(result, 'result_version'),
    aoiName: requireString(result, 'aoi_name'),
    geometry: parseAoiGeometry(result.geometry_snapshot),
    startMonth: requireString(result, 'start_month'),
    endMonth: requireString(result, 'end_month'),
    units: requireString(result, 'units'),
    temporalFrequency: parseTemporalFrequency(result.temporal_frequency),
    validationStatus: requireString(result, 'validation_status'),
    qualityStatus: requireString(result, 'quality_status'),
    qualityNote: requireString(result, 'quality_note'),
    provenanceNote: requireString(result, 'provenance_note'),
    isDemo: result.is_demo === true,
  }
}

export function parseSeries(payload: unknown): SeriesResponse {
  const series = requireRecord(payload, 'series must be an object')
  const selectionType = requireString(series, 'selection_type')
  if (selectionType !== 'Point' && selectionType !== 'Polygon') {
    throw new Error('Invalid payload: series selection_type must be Point or Polygon')
  }
  const points = parseEnvelopeList(series.points, ['items']).map((item) => {
    const point = requireRecord(item, 'series point must be an object')
    const state = requireString(point, 'state')
    if (!SERIES_STATES.includes(state as SeriesState)) {
      throw new Error(`Invalid payload: unsupported series state ${state}`)
    }
    return {
      periodStart: requireString(point, 'period_start'),
      periodEnd: requireString(point, 'period_end'),
      value: optionalNumberFrom(point, ['value']),
      unit: requireString(point, 'unit'),
      state: state as SeriesState,
      qualityStatus: requireString(point, 'quality_status'),
      coverage: optionalNumberFrom(point, ['coverage']),
      note: optionalStringFrom(point, ['note']),
    }
  })
  return {
    resultId: requireString(series, 'result_id'),
    productId: requireString(series, 'product_id'),
    geometryWkt: requireString(series, 'geometry_wkt'),
    crs: requireString(series, 'crs'),
    selectionType,
    aggregationMethod: requireString(series, 'aggregation_method'),
    units: requireString(series, 'units'),
    qualityStatus: requireString(series, 'quality_status'),
    qualityNote: requireString(series, 'quality_note'),
    coverage: optionalNumberFrom(series, ['coverage']),
    isDemo: series.is_demo === true,
    note: requireString(series, 'note'),
    points,
  }
}

export function parseCostEstimate(payload: unknown): CostEstimate {
  const estimate = requireRecord(payload, 'cost estimate must be an object')
  const admission = requireString(estimate, 'admission')
  const estimatedCredits = optionalNumberFrom(estimate, ['estimated_credits'])
  if (estimatedCredits === null) {
    throw new Error('Invalid payload: estimated_credits must be a finite number')
  }
  if (!['ADMITTED', 'INSUFFICIENT_CREDITS', 'UNAVAILABLE'].includes(admission)) {
    throw new Error(`Invalid payload: unsupported admission ${admission}`)
  }
  return {
    productId: requireString(estimate, 'product_id'),
    aoiId: requireString(estimate, 'aoi_id'),
    startMonth: requireString(estimate, 'start_month'),
    endMonth: requireString(estimate, 'end_month'),
    feasible: estimate.feasible === true,
    estimatedCredits,
    currency: requireString(estimate, 'currency'),
    balance: optionalNumberFrom(estimate, ['balance']),
    balanceAvailable: estimate.balance_available === true,
    admission: admission as CostAdmission,
    conditions: optionalStringListFrom(estimate, ['conditions']),
    limitations: optionalStringListFrom(estimate, ['limitations']),
  }
}

export function parseDelivery(payload: unknown): Delivery {
  const delivery = requireRecord(payload, 'delivery must be an object')
  const state = requireString(delivery, 'state')
  if (!DELIVERY_STATES.includes(state as DeliveryState)) {
    throw new Error(`Invalid payload: unsupported delivery state ${state}`)
  }
  const kind = optionalStringFrom(delivery, ['kind'])
  return {
    id: requireStringFrom(delivery, ['delivery_id', 'id']),
    kind: kind === 'final_product' || kind === 'dependency_archive' ? kind : null,
    state: state as DeliveryState,
    downloadUrl: optionalStringFrom(delivery, ['download_url', 'url']),
    message: optionalStringFrom(delivery, ['message', 'reason']),
  }
}

export function parseAccount(payload: unknown): Account {
  const account = requireRecord(payload, 'account must be an object')
  return {
    userId: requireStringFrom(account, ['user_id', 'id']),
    displayName: requireStringFrom(account, ['display_name', 'name']),
    sessionStatus: requireString(account, 'session_status'),
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
      ...(input.temporalFrequency ? { temporal_frequency: input.temporalFrequency } : {}),
    }),
  )
}

export function estimateAnalysisRequest(
  input: AnalysisRequestInput,
): Promise<ApiResponse<CostEstimate>> {
  return requestJson(
    `${API_PREFIX}/analysis-requests/estimate`,
    parseCostEstimate,
    jsonRequest('POST', {
      product_id: input.productId,
      aoi_id: input.aoiId,
      period: { start_month: input.startMonth, end_month: input.endMonth },
      ...(input.spatialResolutionM != null
        ? { spatial_resolution_m: input.spatialResolutionM }
        : {}),
      ...(input.sources && input.sources.length > 0 ? { sources: input.sources } : {}),
      ...(input.temporalFrequency ? { temporal_frequency: input.temporalFrequency } : {}),
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
