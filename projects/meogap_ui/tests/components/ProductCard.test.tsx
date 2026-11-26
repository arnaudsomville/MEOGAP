import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../../src/api/client'
import { ProductCard, ProductPreview } from '../../src/components/ProductCard'

const TYPED_PRODUCT: Product = {
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

describe('ProductCard', () => {
  it('renders a selected product and handles selection', { tags: ['unit'] }, async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ProductCard product={TYPED_PRODUCT} selected onSelect={onSelect} />)
    const button = screen.getByRole('button', { name: /NDVI/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Native 10 m/)).toBeInTheDocument()
    await user.click(button)
    expect(onSelect).toHaveBeenCalled()
  })

  it('falls back when preview and metadata are missing', { tags: ['unit'] }, () => {
    const sparse: Product = {
      ...TYPED_PRODUCT,
      preview: null,
      category: null,
      nativeResolution: null,
      description: null,
      level: null,
    }
    render(<ProductCard product={sparse} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'No preview available for NDVI' })).toBeInTheDocument()
    expect(screen.getByText('No product description was supplied.')).toBeInTheDocument()
    expect(screen.getByText('Scientific metadata unavailable')).toBeInTheDocument()
    expect(screen.getByText('Level unavailable')).toBeInTheDocument()
  })

  it('replaces a broken preview with the fallback', { tags: ['unit'] }, () => {
    render(<ProductPreview product={TYPED_PRODUCT} />)
    const image = screen.getByRole('img', { name: 'NDVI illustrative preview' })
    fireEvent.error(image)
    expect(screen.getByRole('img', { name: 'No preview available for NDVI' })).toBeInTheDocument()
    expect(screen.getByText('Illustrative preview, not a scientific result')).toBeInTheDocument()
  })
})
