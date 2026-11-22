import { cx } from '../lib/cx'

interface PagerProps {
  page: number
  pageCount: number
  /** Rows on this page. */
  shown: number
  total: number
  onPage: (page: number) => void
}

const pageButton =
  'min-h-11 min-w-11 rounded-lg border px-3 disabled:cursor-not-allowed disabled:opacity-40'
const idleButton = 'border-line bg-card'
const currentButton = 'border-navy bg-navy text-white'

/** "Showing x of y records" with Previous, numbered pages and Next (prototype `.pager`). */
export function Pager({ page, pageCount, shown, total, onPage }: PagerProps) {
  const pages = Array.from({ length: Math.max(1, pageCount) }, (_, i) => i + 1)
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-sm text-mute"
    >
      <span>
        Showing <b className="text-ink">{shown}</b> of <b className="text-ink">{total}</b> records
      </span>
      <div className="flex gap-1.5">
        <button
          type="button"
          className={cx(pageButton, idleButton)}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === page ? 'page' : undefined}
            className={cx(pageButton, n === page ? currentButton : idleButton)}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className={cx(pageButton, idleButton)}
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
