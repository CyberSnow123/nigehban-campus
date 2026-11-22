import type { ReactNode } from 'react'

import { cx } from '../lib/cx'

export interface Column {
  key: string
  label: string
  align?: 'right'
  /** Mono font and no wrapping: IDs, times. */
  mono?: boolean
}

export interface TableRow {
  id: string
  /** Cell content by column key. */
  cells: Record<string, ReactNode>
}

interface TableProps {
  /** Accessible name for the table. */
  caption: string
  columns: Column[]
  rows: TableRow[]
  loading?: boolean
  /** Message shown instead of rows when the request failed. */
  error?: string
  /** Message shown when there are no rows. */
  emptyText: string
}

/** One note row (loading, error or empty) that spans every column. */
function NoteRow({ span, tone, children }: { span: number; tone?: 'error'; children: ReactNode }) {
  return (
    <tr>
      <td
        colSpan={span}
        role={tone === 'error' ? 'alert' : 'status'}
        className={cx(
          'stack-note px-4 py-8 text-center',
          tone === 'error' ? 'text-red' : 'text-mute',
        )}
      >
        {children}
      </td>
    </tr>
  )
}

/** Data table. Under 760 px each row becomes a card with the column label beside each value. */
export function Table({ caption, columns, rows, loading, error, emptyText }: TableProps) {
  const span = columns.length
  let note: ReactNode = null
  if (loading) note = <NoteRow span={span}>Loading…</NoteRow>
  else if (error)
    note = (
      <NoteRow span={span} tone="error">
        {error}
      </NoteRow>
    )
  else if (rows.length === 0) note = <NoteRow span={span}>{emptyText}</NoteRow>

  return (
    <div className="overflow-x-auto">
      <table className="stack w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-wash">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cx(
                  'border-b border-line px-4 py-3 text-[13px] font-semibold whitespace-nowrap text-mute',
                  c.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {note ??
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-wash">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    data-label={c.label}
                    className={cx(
                      'border-b border-line px-4 py-3 align-middle',
                      c.mono && 'font-mono whitespace-nowrap',
                      c.align === 'right' && 'text-right',
                    )}
                  >
                    {row.cells[c.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
