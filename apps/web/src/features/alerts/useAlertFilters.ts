import type { AlertType } from '../../lib/constants'
import { pageNumber, pick, useFilterUpdater } from '../../lib/urlFilters'

export type TypeFilterValue = 'all' | AlertType
export type StatusFilterValue = 'all' | 'active' | 'acknowledged' | 'closed'

export const TYPES: readonly TypeFilterValue[] = ['all', 'abandoned_bag', 'possible_theft']
const STATUSES: readonly StatusFilterValue[] = ['all', 'active', 'acknowledged', 'closed']

const DEFAULTS = { page: '1' }

/**
 * Alert list filters, kept in the address (`/alerts?type=possible_theft&status=active&q=bag 31`)
 * so a filtered list can be reloaded, shared and reached from the topbar search.
 * Unknown values fall back to "all". Changing a filter goes back to page 1.
 */
export function useAlertFilters() {
  const { params, update } = useFilterUpdater<'type' | 'status' | 'q'>(DEFAULTS)
  return {
    type: pick(TYPES, params.get('type')),
    status: pick(STATUSES, params.get('status')),
    q: params.get('q') ?? '',
    page: pageNumber(params.get('page')),
    update,
  }
}
