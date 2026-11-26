import type { SeriesParameter } from '../api/client'

type SeriesParameterSelectorProps = {
  parameters: SeriesParameter[]
  selected: string[]
  onToggle: (name: string) => void
}

export function SeriesParameterSelector({
  parameters,
  selected,
  onToggle,
}: SeriesParameterSelectorProps) {
  if (parameters.length === 0) return null
  return (
    <fieldset className="choice-group series-parameter-selector">
      <legend>Displayed parameters</legend>
      <p className="field-help">
        Parameter selection only changes the chart. It does not alter the result or submit a new
        request. {parameters.length === 1 ? 'This demo result exposes one parameter.' : ''}
      </p>
      <div className="checkbox-grid">
        {parameters.map((parameter) => (
          <label className="checkbox" key={parameter.name}>
            <input
              type="checkbox"
              checked={selected.includes(parameter.name)}
              onChange={() => onToggle(parameter.name)}
            />
            <span>
              {parameter.label} ({parameter.units})
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
