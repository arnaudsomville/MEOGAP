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

export type SpatialInputType = 'AOI'
export type SelectionGeometryType = 'POINT' | 'POLYGON' | 'RESULT_EXTENT'
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
  provenance: string | null
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
  supportedSelectionGeometries: SelectionGeometryType[]
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

export const ANALYSIS_STATES = ['queued', 'processing', 'succeeded', 'failed', 'cancelled'] as const

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
  provenance: string | null
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

export type LegendStop = {
  value: number
  color: string
}

export type ResultLegend = {
  title: string
  units: string
  min: number
  max: number
  stops: LegendStop[]
}

export type ResultMapFrame = {
  id: string
  url: string
  periodStart: string
  periodEnd: string
  label: string
  visualPeriodStart: string
  visualPeriodEnd: string
  isReusedVisual: boolean
}

export type ResultMap = {
  url: string | null
  bounds: [Position, Position] | null
  requestId: string | null
  productId: string | null
  resultVersion: string | null
  units: string | null
  provenance: string | null
  validationStatus: string | null
  qualityStatus: string | null
  qualityNote: string | null
  legend: ResultLegend | null
  geotiffUrl: string | null
  frames: ResultMapFrame[]
  isDemo: boolean
}

export type SeriesParameter = {
  name: string
  label: string
  units: string
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
  provenance: string | null
  availableParameters: SeriesParameter[]
  validationStatus: string
  qualityStatus: string
  qualityNote: string
  provenanceNote: string
  isDemo: boolean
}

export const SERIES_STATES = ['VALID', 'MISSING', 'MASKED', 'INVALID'] as const

export type SeriesState = (typeof SERIES_STATES)[number]

export type SeriesPoint = {
  parameter: string
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
  selectionAreaKm2: number
  units: string
  availableParameters: SeriesParameter[]
  selectedParameters: string[]
  qualityStatus: string
  qualityNote: string
  coverage: number | null
  provenance: string | null
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
