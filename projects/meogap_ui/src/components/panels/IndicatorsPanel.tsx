import { Icon } from '../Icon'
import { OverlayPanel } from '../OverlayPanel'

export function IndicatorsPanel({ onClose }: { onClose: () => void }) {
  return (
    <OverlayPanel title="Indicators" icon={<Icon name="activity" />} onClose={onClose}>
      <div className="empty-state">
        <span className="empty-state-icon">
          <Icon name="activity" size={26} />
        </span>
        <h3>No indicators are configured.</h3>
        <p>
          Indicators are a later monitoring capability. They are not required to compute or explore
          scientific products.
        </p>
      </div>
    </OverlayPanel>
  )
}
