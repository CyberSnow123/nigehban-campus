import { Segmented } from '../../components/controls'
import type { TypeFilterValue } from './useAlertFilters'

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'abandoned_bag', label: 'Abandoned' },
  { value: 'possible_theft', label: 'Possible theft' },
] as const

/** All / Abandoned / Possible theft, used by the Alerts and History tables. */
export function TypeFilter({
  value,
  onChange,
}: {
  value: TypeFilterValue
  onChange: (value: TypeFilterValue) => void
}) {
  return <Segmented label="Alert type" options={OPTIONS} value={value} onChange={onChange} />
}
