import type { RefObject } from 'react'
import type { Aoi } from '../../api/client'
import { AOI_AREA_LIMIT_MESSAGE, AOI_MAX_AREA_KM2 } from '../../config'
import { formatAreaKm2 } from '../../map/coordinates'
import { Icon } from '../Icon'
import { OverlayPanel } from '../OverlayPanel'
import { StateNotice } from '../StateNotice'

type AoiPanelProps = {
  onClose: () => void
  loading: boolean
  loadError: boolean
  onRetry: () => void
  visibleAois: Aoi[]
  selectedAoiId: string | null
  selectedAoi: Aoi | null
  onSelectAoi: (id: string) => void
  onBeginNew: () => void
  onBeginEdit: (aoi: Aoi) => void
  aoiQuery: string
  setAoiQuery: (query: string) => void
  drawing: boolean
  editingAoiId: string | null
  aoiName: string
  setAoiName: (name: string) => void
  aoiDescription: string
  setAoiDescription: (description: string) => void
  draftVerticesCount: number
  draftAreaKm2: number | null
  draftAreaExceeded: boolean
  onUndoPoint: () => void
  onResetDrawing: () => void
  onSave: () => void
  onDiscard: () => void
  deleteCandidateId: string | null
  setDeleteCandidateId: (id: string | null) => void
  onRemove: (id: string) => void
  drawingFormRef: RefObject<HTMLElement | null>
}

export function AoiPanel({
  onClose,
  loading,
  loadError,
  onRetry,
  visibleAois,
  selectedAoiId,
  selectedAoi,
  onSelectAoi,
  onBeginNew,
  onBeginEdit,
  aoiQuery,
  setAoiQuery,
  drawing,
  editingAoiId,
  aoiName,
  setAoiName,
  aoiDescription,
  setAoiDescription,
  draftVerticesCount,
  draftAreaKm2,
  draftAreaExceeded,
  onUndoPoint,
  onResetDrawing,
  onSave,
  onDiscard,
  deleteCandidateId,
  setDeleteCandidateId,
  onRemove,
  drawingFormRef,
}: AoiPanelProps) {
  return (
    <OverlayPanel title="AOI library" icon={<Icon name="layers" />} onClose={onClose}>
      <p className="panel-intro">
        Saved areas are reusable. Editing or deleting one never changes a submitted request
        snapshot.
      </p>
      <div className="inline-actions">
        <button type="button" className="button button-primary" onClick={onBeginNew}>
          <Icon name="plus" />
          Draw new area
        </button>
        {selectedAoi ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onBeginEdit(selectedAoi)}
          >
            <Icon name="pencil" />
            Edit selected
          </button>
        ) : null}
      </div>
      <label className="field-label" htmlFor="aoi-filter">
        Find saved AOIs
      </label>
      <input
        id="aoi-filter"
        value={aoiQuery}
        onChange={(event) => setAoiQuery(event.target.value)}
        placeholder="Search by name"
      />
      {loading ? <StateNotice icon="refresh">Loading saved AOIs…</StateNotice> : null}
      {!loading && loadError ? (
        <StateNotice icon="alert" tone="error">
          <p>The AOI library is unavailable.</p>
          <button type="button" className="button button-secondary" onClick={onRetry}>
            Retry
          </button>
        </StateNotice>
      ) : null}
      {!loading && !loadError && visibleAois.length === 0 ? (
        <StateNotice icon="map-pin">No saved AOIs match this search.</StateNotice>
      ) : null}
      <div className="aoi-list">
        {visibleAois.map((aoi) => (
          <button
            key={aoi.id}
            type="button"
            className={aoi.id === selectedAoiId ? 'list-item list-item-selected' : 'list-item'}
            onClick={() => onSelectAoi(aoi.id)}
          >
            <span className="list-item-icon">
              <Icon name="map-pin" />
            </span>
            <span className="list-item-body">
              <strong>{aoi.name}</strong>
              <span>Revision {aoi.revision}</span>
            </span>
            {aoi.id === selectedAoiId ? <Icon name="check" /> : null}
          </button>
        ))}
      </div>
      {selectedAoi ? (
        <section className="detail-section">
          <h3>{selectedAoi.name}</h3>
          <p>{selectedAoi.description ?? 'No AOI description.'}</p>
          {deleteCandidateId === selectedAoi.id ? (
            <div className="confirm-delete">
              <p>Delete this saved AOI? Existing request snapshots are unaffected.</p>
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => onRemove(selectedAoi.id)}
                >
                  <Icon name="trash" />
                  Confirm delete
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setDeleteCandidateId(null)}
                >
                  Keep AOI
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button button-danger"
              onClick={() => setDeleteCandidateId(selectedAoi.id)}
            >
              <Icon name="trash" />
              Delete selected
            </button>
          )}
        </section>
      ) : null}
      {drawing ? (
        <section
          ref={drawingFormRef}
          className="detail-section drawing-form"
          aria-label="AOI drawing form"
        >
          <div className="drawing-heading">
            <h3>{editingAoiId ? 'Edit saved area' : 'Draw a new area'}</h3>
            <span className={editingAoiId ? 'drawing-badge badge-editing' : 'drawing-badge'}>
              {editingAoiId ? 'Editing' : 'Draft'}
            </span>
          </div>
          <p>
            Click the map to add boundary points. {draftVerticesCount} boundary point
            {draftVerticesCount === 1 ? '' : 's'} selected.
          </p>
          {draftAreaKm2 !== null ? (
            <p className="draft-area">
              Area: <strong>{formatAreaKm2(draftAreaKm2)}</strong> / maximum {AOI_MAX_AREA_KM2} km²
            </p>
          ) : null}
          {draftAreaExceeded ? (
            <p className="failure-text" role="alert">
              {AOI_AREA_LIMIT_MESSAGE}
            </p>
          ) : null}
          {editingAoiId ? (
            <p className="muted">
              Saving replaces the boundary while preserving the existing AOI identity.
            </p>
          ) : null}
          <label className="field-label" htmlFor="aoi-name">
            Area name
          </label>
          <input
            id="aoi-name"
            value={aoiName}
            onChange={(event) => setAoiName(event.target.value)}
          />
          <label className="field-label" htmlFor="aoi-description">
            Description
          </label>
          <textarea
            id="aoi-description"
            value={aoiDescription}
            onChange={(event) => setAoiDescription(event.target.value)}
          />
          <div className="inline-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onUndoPoint}
              disabled={draftVerticesCount === 0}
              title="Remove the last boundary point"
            >
              <Icon name="undo" />
              Undo last point
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onResetDrawing}
              disabled={draftVerticesCount === 0}
              title="Clear the current draft without deleting saved AOIs"
            >
              <Icon name="rotate" />
              Reset drawing
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={onSave}
              disabled={draftVerticesCount < 3 || draftAreaExceeded}
            >
              <Icon name="check" />
              Save AOI
            </button>
            <button type="button" className="button button-secondary" onClick={onDiscard}>
              <Icon name="close" />
              Discard drawing
            </button>
          </div>
        </section>
      ) : null}
    </OverlayPanel>
  )
}
