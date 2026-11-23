import { useState } from 'react'

import { Button } from '../../components/Button'
import { STATUS_PILL } from '../../lib/constants'
import { useAlertMove, type Alert, type CloseOutcome } from './api'
import { CloseAlertDialog } from './CloseAlertDialog'
import { formatDateTime } from './format'

/**
 * Operator actions. Only moves in `alert.next_statuses` are offered (the API decides them from
 * the transition table), using the prototype's buttons: Acknowledge; Resolve for an abandoned
 * bag; Confirm theft and Authorised pickup for a possible theft; Mark false alarm.
 */
export function AlertActions({ alert }: { alert: Alert }) {
  const move = useAlertMove(alert.id)
  const [outcome, setOutcome] = useState<CloseOutcome | null>(null)
  const can = (status: Alert['status']) => alert.next_statuses.includes(status)
  const theft = alert.type === 'possible_theft'
  const busy = move.isPending

  if (alert.next_statuses.length === 0) {
    return (
      <p className="mt-4 mb-0 rounded-lg bg-wash p-3 text-sm text-mute">
        Closed as <b className="text-ink">{STATUS_PILL[alert.status].label}</b>
        {alert.closed_at && <> on {formatDateTime(alert.closed_at)}</>}. Closed alerts cannot be
        reopened.
      </p>
    )
  }

  const confirm = (note: string) =>
    outcome && move.mutate({ kind: 'close', outcome, note }, { onSettled: () => setOutcome(null) })

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {can('acknowledged') && (
          <Button disabled={busy} onClick={() => move.mutate({ kind: 'acknowledge' })}>
            + Acknowledge
          </Button>
        )}
        {theft && can('confirmed_theft') && (
          <Button variant="pur" disabled={busy} onClick={() => setOutcome('confirmed_theft')}>
            Confirm theft
          </Button>
        )}
        {!theft && can('resolved') && (
          <Button variant="dark" disabled={busy} onClick={() => setOutcome('resolved')}>
            ✓ Resolve
          </Button>
        )}
        {theft && can('authorised_pickup') && (
          <Button
            variant="soft"
            className="col-span-2"
            disabled={busy}
            onClick={() => setOutcome('authorised_pickup')}
          >
            Authorised pickup (friend or staff)
          </Button>
        )}
      </div>
      {can('false_alarm') && (
        <div className="text-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => setOutcome('false_alarm')}
            className="min-h-11 p-2 text-mute underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark false alarm
          </button>
        </div>
      )}
      {move.isError && (
        <p role="alert" className="mt-2 mb-0 text-sm text-red">
          {move.error.message}
        </p>
      )}
      <CloseAlertDialog
        outcome={outcome}
        pending={busy}
        onCancel={() => setOutcome(null)}
        onConfirm={confirm}
      />
    </>
  )
}
