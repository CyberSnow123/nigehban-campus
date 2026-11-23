import { pageNumber, pick, useFilterUpdater } from '../../lib/urlFilters'
import type { CloseOutcome } from '../alerts/api'
import { TYPES } from '../alerts/useAlertFilters'
import type { HistoryDays } from '../stats/api'

export type OutcomeFilterValue = 'all' | CloseOutcome
export type RangeValue = '1' | '7' | '30'

export const OUTCOMES: readonly OutcomeFilterValue[] = [
  'all',
  'resolved',
  'false_alarm',
  'authorised_pickup',
  'confirmed_theft',
]
const RANGES: readonly RangeValue[] = ['7', '1', '30'] // the first is the default

const DEFAULTS = { page: '1', range: '7' }

/**
 * History filters in the address: `/history?type=&outcome=&range=&q=&page=` (phase-08
 * decision 4). Unknown values fall back to the defaults. Changing a filter goes back to page 1.
 */
export function useHistoryFilters() {
  const { params, update } = useFilterUpdater<'type' | 'outcome' | 'range' | 'q'>(DEFAULTS)
  const range = pick(RANGES, params.get('range'))
  return {
    type: pick(TYPES, params.get('type')),
    outcome: pick(OUTCOMES, params.get('outcome')),
    range,
    days: Number(range) as HistoryDays,
    q: params.get('q') ?? '',
    page: pageNumber(params.get('page')),
    update,
  }
}

export type HistoryFilters = ReturnType<typeof useHistoryFilters>
