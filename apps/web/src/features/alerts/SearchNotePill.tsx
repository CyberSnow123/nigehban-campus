import { Pill } from '../../components/Pill'

/** "Search: bag 31 ×" above a list that the topbar search filtered. Hidden without a search. */
export function SearchNotePill({ q, onClear }: { q: string; onClear: () => void }) {
  if (!q) return null
  return (
    <Pill tone="blu">
      Search: {q}
      <button type="button" aria-label="Clear search" onClick={onClear} className="font-bold">
        ×
      </button>
    </Pill>
  )
}
