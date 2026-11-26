import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Aoi, Product } from '../../../src/api/client'
import { RequestPanel } from '../../../src/components/panels/RequestPanel'
import { AOI } from '../../app/fixtures'

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
  limitations: ['Demo.'],
  supportedSources: ['Sentinel'],
  supportedResolutionsM: [10, 20],
  supportedSpatialInputs: ['AOI'],
  supportedSelectionGeometries: ['POINT', 'POLYGON', 'RESULT_EXTENT'],
  supportedFrequencies: ['monthly', 'weekly'],
  preview: null,
}
const AOI_VIEW: Aoi = {
  ...AOI,
  id: AOI.aoi_id,
  createdAt: AOI.created_at,
  updatedAt: AOI.updated_at,
}

function renderPanel(overrides: Partial<Parameters<typeof RequestPanel>[0]> = {}) {
  const props: Parameters<typeof RequestPanel>[0] = {
    onClose: vi.fn(),
    products: [PRODUCT],
    aois: [AOI_VIEW],
    requestProductId: '',
    onChangeProduct: vi.fn(),
    requestAoiId: '',
    onSelectAoi: vi.fn(),
    onBeginNewAoi: vi.fn(),
    startMonth: '',
    setStartMonth: vi.fn(),
    endMonth: '',
    setEndMonth: vi.fn(),
    requestFrequency: '',
    setRequestFrequency: vi.fn(),
    requestFrequencyOptions: [],
    requestProduct: null,
    missionsLoading: false,
    missionsError: null,
    missions: [],
    requestSources: [],
    allMissionsSelected: false,
    onToggleSource: vi.fn(),
    onSelectAllSources: vi.fn(),
    requestResolution: '',
    setRequestResolution: vi.fn(),
    estimate: null,
    estimating: false,
    estimateError: null,
    admissionLabel: null,
    canSubmit: false,
    onSubmit: vi.fn(),
    onClearEstimate: vi.fn(),
    ...overrides,
  }
  const view = render(<RequestPanel {...props} />)
  return { ...view, ...props }
}

describe('RequestPanel', () => {
  it('renders incomplete product, AOI and period guidance', { tags: ['unit'] }, () => {
    const panel = renderPanel()
    expect(screen.getByText(/Select a product to load/)).toBeInTheDocument()
    expect(screen.getByText(/Select a product, an AOI/)).toBeInTheDocument()
    expect(screen.getByText(/Complete the product, AOI/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled()
    expect(panel.onSubmit).not.toHaveBeenCalled()
  })

  it(
    'handles product selection, AOI zoom, metadata and source restrictions',
    { tags: ['unit'] },
    async () => {
      const user = userEvent.setup()
      const panel = renderPanel({
        requestProductId: 'ndvi',
        requestProduct: PRODUCT,
        requestFrequencyOptions: PRODUCT.supportedFrequencies,
        requestAoiId: 'aoi-1',
        missions: [
          {
            id: 'Sentinel',
            name: 'Sentinel',
            provider: 'ESA',
            instrument: 'MSI',
            nativeResolution: '10 m',
            temporalResolution: '5 days',
            availability: 'DEMO',
          },
        ],
        requestSources: ['Sentinel'],
        allMissionsSelected: true,
      })
      await user.selectOptions(screen.getByLabelText('Product'), 'ndvi')
      expect(panel.onChangeProduct).toHaveBeenCalledWith('ndvi')
      await user.selectOptions(screen.getByLabelText('Saved AOI'), 'aoi-1')
      expect(panel.onSelectAoi).toHaveBeenCalledWith('aoi-1')
      await user.click(screen.getByRole('button', { name: 'Toulouse study area' }))
      expect(panel.onSelectAoi).toHaveBeenCalledWith('aoi-1')
      await user.click(screen.getByRole('button', { name: 'Create a saved AOI' }))
      expect(panel.onBeginNewAoi).toHaveBeenCalled()
      expect(screen.getByText(/Native 10 m/)).toBeInTheDocument()
      expect(screen.getByText(/POINT, POLYGON, RESULT_EXTENT/)).toBeInTheDocument()
      expect(screen.getByText(/All compatible missions are selected/)).toBeInTheDocument()
      await user.click(screen.getByRole('checkbox', { name: 'Sentinel' }))
      expect(panel.onToggleSource).toHaveBeenCalledWith('Sentinel')
      await user.selectOptions(screen.getByLabelText('Maximum allowed pixel size (m)'), '20')
      expect(panel.setRequestResolution).toHaveBeenCalledWith('20')
    },
  )

  it('renders frequency and mission error states', { tags: ['unit'] }, () => {
    const panel = renderPanel({
      requestProduct: { ...PRODUCT, supportedFrequencies: [] },
      missionsError: 'offline',
    })
    expect(screen.getByText(/declares no supported temporal frequency/)).toBeInTheDocument()
    expect(screen.getByText(/Compatible missions are unavailable: offline/)).toBeInTheDocument()
    expect(panel.canSubmit).toBe(false)
  })

  it('renders cost and admission states', { tags: ['unit'] }, () => {
    const estimating = renderPanel({ estimating: true })
    expect(screen.getByText('Estimating cost…')).toBeInTheDocument()
    estimating.unmount()

    const error = renderPanel({ estimateError: 'unavailable' })
    expect(screen.getByText('Estimate unavailable: unavailable')).toBeInTheDocument()
    error.unmount()

    renderPanel({
      estimate: {
        productId: 'ndvi',
        aoiId: 'aoi-1',
        startMonth: '2026-01',
        endMonth: '2026-02',
        feasible: true,
        estimatedCredits: 3,
        currency: 'credits',
        balance: 12,
        balanceAvailable: true,
        admission: 'ADMITTED',
        conditions: [],
        limitations: [],
      },
      admissionLabel: 'Admitted',
      canSubmit: true,
    })
    expect(screen.getByText('3 credits')).toBeInTheDocument()
    expect(screen.getByText('12 credits')).toBeInTheDocument()
    expect(screen.getByText('Admitted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeEnabled()
  })
})
