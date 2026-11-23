import { SelectField } from '../../components/controls'
import { STATUS_PILL } from '../../lib/constants'
import { SearchNotePill } from '../alerts/SearchNotePill'
import { TypeFilter } from '../alerts/TypeFilter'
import { OUTCOMES, type HistoryFilters, type RangeValue } from './useHistoryFilters'

const RANGE_OPTIONS: ReadonlyArray<{ value: RangeValue; label: string }> = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

/** Type segment, search note, outcome and date range (phase-08 decision 4). */
export function HistoryBar({ filters }: { filters: HistoryFilters }) {
  const { type, outcome, range, q, update } = filters
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-3.5">
      <TypeFilter value={type} onChange={(value) => update('type', value)} />
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchNotePill q={q} onClear={() => update('q', '')} />
        <SelectField
          label="Outcome"
          value={outcome}
          onChange={(event) => update('outcome', event.target.value)}
        >
          {OUTCOMES.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All outcomes' : STATUS_PILL[value].label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Date range"
          value={range}
          onChange={(event) => update('range', event.target.value)}
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  )
}
