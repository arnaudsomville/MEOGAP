import {
  HEALTH_KEYS,
  hasExactKeys,
  optionalIntegerListFrom,
  optionalNumberFrom,
  optionalStringFrom,
  optionalStringListFrom,
  parseEnvelopeList,
  parseMultiPolygonCoordinates,
  parsePolygonCoordinates,
  requirePositiveInteger,
  requireRecord,
  requireString,
  requireStringFrom,
} from './http'
import type {
  Account,
  AnalysisRequest,
  AnalysisState,
  Aoi,
  AoiGeometry,
  CostAdmission,
  CostEstimate,
  CreditBalance,
  Delivery,
  DeliveryKind,
  DeliveryState,
  Health,
  LegendStop,
  Position,
  Product,
  ProductMissions,
  ProductPreview,
  PlaceSuggestion,
  PlaceSuggestionList,
  ProductRequirements,
  ResultDetail,
  ResultLegend,
  ResultMap,
  ResultMapFrame,
  SelectionGeometryType,
  SeriesParameter,
  SeriesPoint,
  SeriesResponse,
  SeriesState,
  SourceMissionInfo,
  SpatialInputType,
  TemporalFrequency,
} from './types'
import { ANALYSIS_STATES, DELIVERY_STATES, SERIES_STATES } from './types'

export function parseHealth(payload: unknown): Health {
  if (!isRecordWithKeys(payload, HEALTH_KEYS)) {
    throw new Error('Invalid payload: expected exactly status, service and version')
  }
  return {
    status: requireString(payload, 'status'),
    service: requireString(payload, 'service'),
    version: requireString(payload, 'version'),
  }
}

function isRecordWithKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    hasExactKeys(value as Record<string, unknown>, keys)
  )
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

const SPATIAL_INPUT_TYPES: readonly SpatialInputType[] = ['AOI']
const SELECTION_GEOMETRY_TYPES: readonly SelectionGeometryType[] = [
  'POINT',
  'POLYGON',
  'RESULT_EXTENT',
]
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

function optionalSelectionGeometryList(
  value: Record<string, unknown>,
  key: string,
): SelectionGeometryType[] {
  return optionalStringListFrom(value, [key]).filter((item): item is SelectionGeometryType =>
    SELECTION_GEOMETRY_TYPES.includes(item as SelectionGeometryType),
  )
}

function optionalFrequencyList(value: Record<string, unknown>, key: string): TemporalFrequency[] {
  return optionalStringListFrom(value, [key]).filter((item): item is TemporalFrequency =>
    TEMPORAL_FREQUENCIES.includes(item as TemporalFrequency),
  )
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
    provenance: optionalStringFrom(product, ['provenance']),
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
    supportedSelectionGeometries: optionalSelectionGeometryList(
      product,
      'supported_selection_geometries',
    ),
    supportedFrequencies: optionalFrequencyList(product, 'supported_frequencies'),
    preview: parseProductPreview(product.preview),
  }
}

export function parseProductMissions(payload: unknown): ProductMissions {
  const record = requireRecord(payload, 'product missions must be an object')
  const items = parseEnvelopeList(payload, ['items']).map<SourceMissionInfo>((item) => {
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

export function parsePlaceSuggestion(payload: unknown): PlaceSuggestion {
  const place = requireRecord(payload, 'place suggestion must be an object')
  const latitude = optionalNumberFrom(place, ['latitude'])
  const longitude = optionalNumberFrom(place, ['longitude'])
  const population = optionalNumberFrom(place, ['population'])
  if (latitude === null || longitude === null || population === null) {
    throw new Error('Invalid payload: place suggestion coordinates and population are required')
  }
  const placeId = optionalNumberFrom(place, ['place_id', 'placeId'])
  if (placeId === null) {
    throw new Error('Invalid payload: place suggestion place_id is required')
  }
  return {
    placeId,
    name: requireString(place, 'name'),
    country: requireString(place, 'country'),
    admin1: optionalStringFrom(place, ['admin1']),
    latitude,
    longitude,
    population,
    featureCode: requireStringFrom(place, ['feature_code', 'featureCode']),
    matchType: requireStringFrom(place, ['match_type', 'matchType']),
  }
}

export function parsePlaceSuggestionList(payload: unknown): PlaceSuggestionList {
  const record = requireRecord(payload, 'place suggestions must be an object')
  return {
    items: parseEnvelopeList(record.items, ['items']).map(parsePlaceSuggestion),
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
  if (
    value === 'monthly' ||
    value === 'semimonthly' ||
    value === 'weekly' ||
    value === 'three_day' ||
    value === 'two_day' ||
    value === 'daily'
  ) {
    return value
  }
  throw new Error('Invalid payload: unsupported temporal_frequency')
}

function parseAnalysisState(value: unknown): AnalysisState {
  const state = requireString({ state: value }, 'state')
  if (!ANALYSIS_STATES.includes(state as AnalysisState)) {
    throw new Error(`Invalid payload: unsupported analysis request state ${state}`)
  }
  return state as AnalysisState
}

export function parseAnalysisRequest(payload: unknown): AnalysisRequest {
  const request = requireRecord(payload, 'analysis request must be an object')
  const failure = isRecordLike(request.failure) ? request.failure : null
  const geometry = request.geometry_snapshot
  return {
    id: requireStringFrom(request, ['request_id', 'id']),
    state: parseAnalysisState(request.state),
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
    provenance: optionalStringFrom(request, ['provenance']),
    estimatedCredits: optionalNumberFrom(request, ['estimated_credits', 'estimated_cost']),
    actualCredits: optionalNumberFrom(request, ['actual_credits', 'actual_cost']),
    resultId: optionalStringFrom(request, ['result_id']),
    message: optionalStringFrom(request, ['message', 'reason']),
    failureStage: failure ? optionalStringFrom(failure, ['stage']) : null,
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseAnalysisRequestList(payload: unknown): AnalysisRequest[] {
  return parseEnvelopeList(payload, ['items', 'requests']).map(parseAnalysisRequest)
}

function parseBounds(value: unknown): [Position, Position] | null {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value) || value.length !== 2) return null
  const [southWest, northEast] = value
  if (!Array.isArray(southWest) || !Array.isArray(northEast)) return null
  if (southWest.length < 2 || northEast.length < 2) return null
  if (
    typeof southWest[0] !== 'number' ||
    typeof southWest[1] !== 'number' ||
    typeof northEast[0] !== 'number' ||
    typeof northEast[1] !== 'number'
  ) {
    return null
  }
  return [
    { lat: southWest[0], lng: southWest[1] },
    { lat: northEast[0], lng: northEast[1] },
  ]
}

function parseLegendStop(value: unknown): LegendStop {
  const stop = requireRecord(value, 'legend stop must be an object')
  return {
    value: optionalNumberFrom(stop, ['value']) ?? 0,
    color: requireString(stop, 'color'),
  }
}

function parseLegend(value: unknown): ResultLegend | null {
  if (value === null || value === undefined) return null
  const legend = requireRecord(value, 'legend must be an object or null')
  if (!Array.isArray(legend.stops) || legend.stops.length === 0) {
    throw new Error('Invalid payload: legend stops must be a non-empty array')
  }
  return {
    title: requireString(legend, 'title'),
    units: requireString(legend, 'units'),
    min: optionalNumberFrom(legend, ['min']) ?? 0,
    max: optionalNumberFrom(legend, ['max']) ?? 0,
    stops: legend.stops.map(parseLegendStop),
  }
}

function parseResultFrames(value: unknown): ResultMapFrame[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const frame = requireRecord(item, 'result frame must be an object')
    return {
      id: requireStringFrom(frame, ['frame_id', 'id']),
      url: requireString(frame, 'url'),
      periodStart: requireString(frame, 'period_start'),
      periodEnd: requireString(frame, 'period_end'),
      label: requireString(frame, 'label'),
      visualPeriodStart: requireString(frame, 'visual_period_start'),
      visualPeriodEnd: requireString(frame, 'visual_period_end'),
      isReusedVisual: frame.is_reused_visual === true,
    }
  })
}

export function parseResultMap(payload: unknown): ResultMap {
  const result = requireRecord(payload, 'result map must be an object')
  return {
    url: optionalStringFrom(result, ['map_url', 'url']),
    bounds: parseBounds(result.bounds),
    requestId: optionalStringFrom(result, ['request_id']),
    productId: optionalStringFrom(result, ['product_id']),
    resultVersion: optionalStringFrom(result, ['result_version']),
    units: optionalStringFrom(result, ['units']),
    provenance: optionalStringFrom(result, ['provenance']),
    validationStatus: optionalStringFrom(result, ['validation_status']),
    qualityStatus: optionalStringFrom(result, ['quality_status']),
    qualityNote: optionalStringFrom(result, ['quality_note']),
    legend: parseLegend(result.legend),
    geotiffUrl: optionalStringFrom(result, ['geotiff_url']),
    frames: parseResultFrames(result.frames),
    isDemo: result.is_demo === true,
  }
}

function parseSeriesParameters(value: unknown): SeriesParameter[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const parameter = requireRecord(item, 'series parameter must be an object')
    return {
      name: requireString(parameter, 'name'),
      label: requireString(parameter, 'label'),
      units: requireString(parameter, 'units'),
    }
  })
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
    provenance: optionalStringFrom(result, ['provenance']),
    availableParameters: parseSeriesParameters(result.available_parameters),
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
  const points = parseEnvelopeList(series.points, ['items']).map<SeriesPoint>((item) => {
    const point = requireRecord(item, 'series point must be an object')
    const state = requireString(point, 'state')
    if (!SERIES_STATES.includes(state as SeriesState)) {
      throw new Error(`Invalid payload: unsupported series state ${state}`)
    }
    return {
      parameter: requireString(point, 'parameter'),
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
    selectionAreaKm2: optionalNumberFrom(series, ['selection_area_km2']) ?? 0,
    units: requireString(series, 'units'),
    availableParameters: parseSeriesParameters(series.available_parameters),
    selectedParameters: optionalStringListFrom(series, ['selected_parameters']),
    qualityStatus: requireString(series, 'quality_status'),
    qualityNote: requireString(series, 'quality_note'),
    coverage: optionalNumberFrom(series, ['coverage']),
    provenance: optionalStringFrom(series, ['provenance']),
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

function parseDeliveryState(value: unknown): DeliveryState {
  const state = requireString({ state: value }, 'state')
  if (!DELIVERY_STATES.includes(state as DeliveryState)) {
    throw new Error(`Invalid payload: unsupported delivery state ${state}`)
  }
  return state as DeliveryState
}

function parseDeliveryKind(value: unknown): DeliveryKind | null {
  if (value === 'final_product' || value === 'dependency_archive') return value
  return null
}

export function parseDelivery(payload: unknown): Delivery {
  const delivery = requireRecord(payload, 'delivery must be an object')
  return {
    id: requireStringFrom(delivery, ['delivery_id', 'id']),
    kind: parseDeliveryKind(delivery.kind),
    state: parseDeliveryState(delivery.state),
    downloadUrl: optionalStringFrom(delivery, ['download_url', 'url']),
    message: optionalStringFrom(delivery, ['message']),
  }
}

export function parseAccount(payload: unknown): Account {
  const account = requireRecord(payload, 'account must be an object')
  return {
    userId: requireString(account, 'user_id'),
    displayName: requireString(account, 'display_name'),
    sessionStatus: requireString(account, 'session_status'),
  }
}

export function parseCreditBalance(payload: unknown): CreditBalance {
  const balance = requireRecord(payload, 'credit balance must be an object')
  return {
    balance: optionalNumberFrom(balance, ['balance']) ?? 0,
    unit: optionalStringFrom(balance, ['unit']),
  }
}
