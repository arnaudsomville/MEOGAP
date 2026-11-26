import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Product, ProductRequirements, SourceMissionInfo } from '../../../src/api/client'
import { CataloguePanel } from '../../../src/components/panels/CataloguePanel'

const PRODUCT: Product = {
  id: 'ndvi',
  name: 'NDVI',
  description: 'Vegetation index',
  level: 'L1',
  category: 'Vegetation',
  nativeResolution: '10 m',
  temporalResolution: '5 days',
  units: 'unitless',
  availability: 'DEMO',
  provenance: 'SYNTHETIC_DEMO',
  validationStatus: 'NOT_VALIDATED',
  documentationStatus: 'PLACEHOLDER',
  documentationUrl: null,
  maxPeriodMonths: 120,
  inputs: ['Red reflectance'],
  parameters: ['ndvi'],
  limitations: ['Demo limitation.'],
  supportedSources: ['Sentinel'],
  supportedResolutionsM: [10],
  supportedSpatialInputs: ['AOI'],
  supportedSelectionGeometries: ['POINT', 'POLYGON', 'RESULT_EXTENT'],
  supportedFrequencies: ['monthly'],
  preview: {
    url: 'data:image/svg+xml,preview',
    alt: 'NDVI illustrative preview',
    attribution: 'MEOGAP synthetic illustration',
  },
}
const MISSIONS: SourceMissionInfo[] = [
  {
    id: 'Sentinel',
    name: 'Sentinel',
    provider: 'ESA',
    instrument: 'MSI',
    nativeResolution: '10 m',
    temporalResolution: '5 days',
    availability: 'DEMO',
  },
]
const REQUIREMENTS: ProductRequirements = {
  productId: 'ndvi',
  inputs: ['Red reflectance'],
  limitations: ['No real acquisition.'],
  note: 'Demo requirements.',
}

function renderPanel(overrides: Partial<Parameters<typeof CataloguePanel>[0]> = {}) {
  const props: Parameters<typeof CataloguePanel>[0] = {
    onClose: vi.fn(),
    products: [PRODUCT],
    selectedProductId: null,
    selectedProduct: null,
    requirements: null,
    loading: false,
    loadError: false,
    onRetry: vi.fn(),
    onSelectProduct: vi.fn(),
    onOpenRequest: vi.fn(),
    missionsProductId: null,
    missions: [],
    missionsLoading: false,
    missionsError: null,
    ...overrides,
  }
  const view = render(<CataloguePanel {...props} />)
  return { ...view, ...props }
}

describe('CataloguePanel', () => {
  it('renders loading, error and empty catalogue states', { tags: ['unit'] }, () => {
    const loading = renderPanel({ loading: true })
    expect(screen.getByText('Loading catalogue…')).toBeInTheDocument()
    loading.unmount()
    const error = renderPanel({ loadError: true, products: [] })
    expect(screen.getByText('The product catalogue is unavailable.')).toBeInTheDocument()
    error.unmount()
    renderPanel({ products: [] })
    expect(screen.getByText('No products are available yet.')).toBeInTheDocument()
  })

  it('selects a product and opens the request form', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const panel = renderPanel({ selectedProductId: 'ndvi', selectedProduct: PRODUCT })
    await user.click(screen.getByRole('button', { name: /NDVI/ }))
    expect(panel.onSelectProduct).toHaveBeenCalledWith('ndvi')
    await user.click(screen.getByRole('button', { name: 'Configure request' }))
    expect(panel.onOpenRequest).toHaveBeenCalledWith('ndvi')
    expect(screen.getByText('Demo limitation.')).toBeInTheDocument()
  })

  it('renders mission metadata, requirements and explicit limitations', { tags: ['unit'] }, () => {
    renderPanel({
      selectedProduct: PRODUCT,
      missionsProductId: 'ndvi',
      missions: MISSIONS,
      requirements: REQUIREMENTS,
    })
    expect(screen.getByText(/Compatibility descriptors only/)).toBeInTheDocument()
    expect(screen.getByText(/Sentinel · ESA · MSI/)).toBeInTheDocument()
    expect(screen.getByText('Red reflectance')).toBeInTheDocument()
    expect(screen.getByText('No real acquisition.')).toBeInTheDocument()
    expect(screen.getByText('Demo requirements.')).toBeInTheDocument()
  })

  it('renders mission loading and error states', { tags: ['unit'] }, () => {
    const loading = renderPanel({
      selectedProduct: PRODUCT,
      missionsProductId: 'ndvi',
      missionsLoading: true,
    })
    expect(screen.getByText('Loading compatible missions…')).toBeInTheDocument()
    loading.unmount()
    renderPanel({
      selectedProduct: PRODUCT,
      missionsProductId: 'ndvi',
      missionsError: 'offline',
      requirements: { ...REQUIREMENTS, inputs: [], limitations: [], note: '' },
    })
    expect(screen.getByText(/Mission metadata unavailable: offline/)).toBeInTheDocument()
    expect(screen.getByText('No specific inputs are declared.')).toBeInTheDocument()
  })
})
