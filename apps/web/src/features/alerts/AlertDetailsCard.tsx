import { Button } from '../../components/Button'
import { Card, CardBody, CardHeader } from '../../components/Card'
import { KeyValue } from '../../components/KeyValue'
import type { AlertType } from '../../lib/constants'
import { cx } from '../../lib/cx'

/** Rows of the details card for each alert type, in the prototype's order. */
const ROWS: Record<AlertType | 'unknown', readonly string[]> = {
  abandoned_bag: [
    'Type',
    'Bag',
    'Owner',
    'Camera',
    'Time',
    'Distance',
    'Separation',
    'Threshold',
    'Status',
  ],
  possible_theft: [
    'Alert type',
    'Bag',
    'Registered owner',
    'Active carrier',
    'Owner distance',
    'Owner away',
    'Bag movement',
    'Camera',
    'Time',
    'Status',
  ],
  // Until the alert loads we only know the fields every alert has.
  unknown: ['Type', 'Bag', 'Camera', 'Time', 'Status'],
}

const CHECK_CODE: Record<AlertType, string> = {
  abandoned_bag: 'ABANDON_CHECK',
  possible_theft: 'THEFT_CHECK',
}

const NOT_YET = 'Alert actions arrive in Phase 7'

/** Operator actions. The outcomes offered depend on the alert type (Data-Contracts §2). */
function AlertActions({ type }: { type?: AlertType }) {
  const theft = type === 'possible_theft'
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button disabled title={NOT_YET}>
          + Acknowledge
        </Button>
        {theft ? (
          <Button variant="pur" disabled title={NOT_YET}>
            Confirm theft
          </Button>
        ) : (
          <Button variant="dark" disabled title={NOT_YET}>
            ✓ Resolve
          </Button>
        )}
        {theft && (
          <Button variant="soft" className="col-span-2" disabled title={NOT_YET}>
            Authorised pickup (friend or staff)
          </Button>
        )}
      </div>
      <div className="text-center">
        <button
          type="button"
          disabled
          title={NOT_YET}
          className="min-h-11 p-2 text-mute underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark false alarm
        </button>
      </div>
    </>
  )
}

export function AlertDetailsCard({ type }: { type?: AlertType }) {
  const rows = ROWS[type ?? 'unknown']
  return (
    <Card>
      <CardHeader
        title="Alert details"
        aside={
          <span className={cx('font-mono', type === 'possible_theft' ? 'text-pur' : 'text-red')}>
            {type ? CHECK_CODE[type] : '—'}
          </span>
        }
      />
      <CardBody>
        {rows.map((label) => (
          <KeyValue key={label} label={label} />
        ))}
        <AlertActions type={type} />
      </CardBody>
    </Card>
  )
}
