import type { SeriesPoint } from '../api/client'
import {
  availableYears,
  describeTemporalFilters,
  MONTH_LABELS,
  SEASON_LABELS,
  type Hemisphere,
  type Season,
  type TemporalFilters,
} from '../temporal'

type TemporalFiltersProps = {
  points: SeriesPoint[]
  filters: TemporalFilters
  hemisphere: Hemisphere
  onChange: (filters: TemporalFilters) => void
  onReset: () => void
}

const ALL_SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn']

function toggleNumber(values: number[], value: number): number[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function toggleSeason(values: Season[], value: Season): Season[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function TemporalFilters({
  points,
  filters,
  hemisphere,
  onChange,
  onReset,
}: TemporalFiltersProps) {
  const years = availableYears(points)
  return (
    <section className="temporal-filters" aria-label="Temporal display filters">
      <header>
        <h4>Temporal display filters</h4>
        <button type="button" className="text-button" onClick={onReset}>
          Reset filters
        </button>
      </header>
      <p className="field-help">
        {describeTemporalFilters(filters)}. Filters only change the displayed subset; they do not
        alter the scientific result or aggregate seasons.
      </p>
      {years.length ? (
        <fieldset className="choice-group">
          <legend>Years</legend>
          <div className="checkbox-grid">
            {years.map((year) => (
              <label className="checkbox" key={year}>
                <input
                  type="checkbox"
                  checked={filters.years.includes(year)}
                  onChange={() =>
                    onChange({ ...filters, years: toggleNumber(filters.years, year) })
                  }
                />
                <span>{year}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="choice-group">
        <legend>Months</legend>
        <div className="checkbox-grid">
          {MONTH_LABELS.map((label, index) => {
            const month = index + 1
            return (
              <label className="checkbox" key={month}>
                <input
                  type="checkbox"
                  checked={filters.months.includes(month)}
                  onChange={() =>
                    onChange({ ...filters, months: toggleNumber(filters.months, month) })
                  }
                />
                <span>{label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="choice-group" disabled={hemisphere === 'mixed'}>
        <legend>Meteorological seasons</legend>
        {hemisphere === 'mixed' ? (
          <p className="field-help">
            Seasonal filtering is unavailable because the selected geometry crosses the equator. Use
            month filters instead.
          </p>
        ) : (
          <p className="field-help">
            {hemisphere === 'southern' ? 'Southern' : 'Northern'} Hemisphere meteorological seasons
            are applied explicitly.
          </p>
        )}
        <div className="checkbox-grid">
          {ALL_SEASONS.map((season) => (
            <label className="checkbox" key={season}>
              <input
                type="checkbox"
                checked={filters.seasons.includes(season)}
                disabled={hemisphere === 'mixed'}
                onChange={() =>
                  onChange({ ...filters, seasons: toggleSeason(filters.seasons, season) })
                }
              />
              <span>{SEASON_LABELS[season]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
