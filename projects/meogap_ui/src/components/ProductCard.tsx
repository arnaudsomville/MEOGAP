import { useState } from 'react'
import type { Product } from '../api/client'
import { Icon } from './Icon'

function ProductThumb({ product, large = false }: { product: Product; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!product.preview || failedUrl === product.preview.url) {
    return (
      <span
        className={
          large
            ? 'product-thumb product-thumb-large product-thumb-fallback'
            : 'product-thumb product-thumb-fallback'
        }
        role="img"
        aria-label={`No preview available for ${product.name}`}
      >
        <Icon name="image" size={large ? 34 : 24} />
        <span>No preview</span>
      </span>
    )
  }

  return (
    <span className={large ? 'product-thumb product-thumb-large' : 'product-thumb'}>
      <img
        src={product.preview.url}
        alt={product.preview.alt}
        loading="lazy"
        onError={() => setFailedUrl(product.preview?.url ?? null)}
      />
    </span>
  )
}

export function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: Product
  selected: boolean
  onSelect: () => void
}) {
  const meta = [
    product.category,
    product.nativeResolution ? `Native ${product.nativeResolution}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      className={selected ? 'product-card product-card-selected' : 'product-card'}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <ProductThumb product={product} />
      <span className="product-card-body">
        <span className="product-card-heading">
          <strong>{product.name}</strong>
          <span className="level-chip">{product.level ?? 'Level unavailable'}</span>
        </span>
        <span className="product-card-description">
          {product.description ?? 'No product description was supplied.'}
        </span>
        <span className="product-card-meta">{meta || 'Scientific metadata unavailable'}</span>
      </span>
    </button>
  )
}

export function ProductPreview({ product }: { product: Product }) {
  return (
    <figure className="product-hero">
      <ProductThumb product={product} large />
      <figcaption>
        <span>Illustrative preview, not a scientific result</span>
        {product.preview?.attribution ? <span>{product.preview.attribution}</span> : null}
      </figcaption>
    </figure>
  )
}
