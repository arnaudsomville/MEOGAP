import type { Product, ProductRequirements, SourceMissionInfo } from '../../api/client'
import { Icon } from '../Icon'
import { OverlayPanel } from '../OverlayPanel'
import { ProductCard, ProductPreview } from '../ProductCard'
import { StateNotice } from '../StateNotice'

type CataloguePanelProps = {
  onClose: () => void
  products: Product[]
  selectedProductId: string | null
  selectedProduct: Product | null
  requirements: ProductRequirements | null
  loading: boolean
  loadError: boolean
  onRetry: () => void
  onSelectProduct: (id: string) => void
  onOpenRequest: (productId: string) => void
  missionsProductId: string | null
  missions: SourceMissionInfo[]
  missionsLoading: boolean
  missionsError: string | null
}

export function CataloguePanel({
  onClose,
  products,
  selectedProductId,
  selectedProduct,
  requirements,
  loading,
  loadError,
  onRetry,
  onSelectProduct,
  onOpenRequest,
  missionsProductId,
  missions,
  missionsLoading,
  missionsError,
}: CataloguePanelProps) {
  return (
    <OverlayPanel title="Product catalogue" icon={<Icon name="compass" />} onClose={onClose}>
      <p className="panel-intro">
        Explore synthetic product descriptors, then configure a separate analysis request.
      </p>
      {loading ? <StateNotice icon="refresh">Loading catalogue…</StateNotice> : null}
      {!loading && loadError ? (
        <StateNotice icon="alert" tone="error">
          <p>The product catalogue is unavailable.</p>
          <button type="button" className="button button-secondary" onClick={onRetry}>
            Retry
          </button>
        </StateNotice>
      ) : null}
      {!loading && !loadError && products.length === 0 ? (
        <StateNotice icon="image">No products are available yet.</StateNotice>
      ) : null}
      <div className="product-list" aria-label="Products">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selected={product.id === selectedProductId}
            onSelect={() => onSelectProduct(product.id)}
          />
        ))}
      </div>
      {selectedProduct ? (
        <section className="detail-section product-detail" aria-label="Selected product details">
          <ProductPreview product={selectedProduct} />
          <h3>{selectedProduct.name}</h3>
          <p>{selectedProduct.description ?? 'No product description was supplied.'}</p>
          <button
            type="button"
            className="button button-primary button-wide"
            onClick={() => onOpenRequest(selectedProduct.id)}
          >
            <Icon name="plus" />
            Configure request
          </button>
          <dl className="metadata-grid">
            <dt>Processing level</dt>
            <dd>{selectedProduct.level ?? 'Unavailable'}</dd>
            <dt>Category</dt>
            <dd>{selectedProduct.category ?? 'Unavailable'}</dd>
            <dt>Native resolution</dt>
            <dd>{selectedProduct.nativeResolution ?? 'Unavailable'}</dd>
            <dt>Temporal resolution</dt>
            <dd>{selectedProduct.temporalResolution ?? 'Unavailable'}</dd>
            <dt>Units</dt>
            <dd>{selectedProduct.units ?? 'Unavailable'}</dd>
            <dt>Availability</dt>
            <dd>{selectedProduct.availability ?? 'Unavailable'}</dd>
            <dt>Provenance</dt>
            <dd>{selectedProduct.provenance ?? 'Unavailable'}</dd>
            <dt>Scientific validation</dt>
            <dd>{selectedProduct.validationStatus ?? 'Unavailable'}</dd>
            <dt>Request spatial inputs</dt>
            <dd>
              {selectedProduct.supportedSpatialInputs.length
                ? selectedProduct.supportedSpatialInputs.join(', ')
                : 'Unavailable'}
            </dd>
            <dt>Result selection geometries</dt>
            <dd>
              {selectedProduct.supportedSelectionGeometries.length
                ? selectedProduct.supportedSelectionGeometries.join(', ')
                : 'Unavailable'}
            </dd>
            <dt>Temporal frequencies</dt>
            <dd>
              {selectedProduct.supportedFrequencies.length
                ? selectedProduct.supportedFrequencies.join(', ')
                : 'Unavailable'}
            </dd>
            <dt>Maximum period</dt>
            <dd>
              {selectedProduct.maxPeriodMonths != null
                ? `${selectedProduct.maxPeriodMonths} months`
                : 'Unavailable'}
            </dd>
            <dt>Documentation</dt>
            <dd>{selectedProduct.documentationStatus ?? 'Unavailable'}</dd>
            <dt>Compatible source missions</dt>
            <dd>
              {selectedProduct.supportedSources.length
                ? selectedProduct.supportedSources.join(', ')
                : 'Unavailable'}
            </dd>
          </dl>
          {missionsProductId === selectedProduct.id ? (
            <div className="requirements">
              <h4>Compatible mission metadata</h4>
              <p className="field-help">
                Compatibility descriptors only. No mission data is acquired or used in M0.
              </p>
              {missionsLoading ? <p>Loading compatible missions…</p> : null}
              {missionsError ? (
                <p className="failure-text">Mission metadata unavailable: {missionsError}</p>
              ) : null}
              {missions.length ? (
                <ul>
                  {missions.map((mission) => (
                    <li key={mission.id}>
                      {mission.name} · {mission.provider} · {mission.instrument} · native{' '}
                      {mission.nativeResolution}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {selectedProduct.limitations.length ? (
            <div className="requirements">
              <h4>Known limitations</h4>
              <ul>
                {selectedProduct.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {requirements ? (
            <div className="requirements">
              <h4>Scientific input requirements</h4>
              {requirements.inputs.length ? (
                <ul>
                  {requirements.inputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              ) : (
                <p>No specific inputs are declared.</p>
              )}
              {requirements.limitations.length ? (
                <>
                  <h4>Limitations</h4>
                  <ul>
                    {requirements.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {requirements.note ? <p className="muted">{requirements.note}</p> : null}
            </div>
          ) : (
            <StateNotice icon="refresh">Loading input requirements…</StateNotice>
          )}
        </section>
      ) : null}
    </OverlayPanel>
  )
}
