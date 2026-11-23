import { Card, CardBody, CardHeader } from '../../components/Card'
import { StatusPill } from '../../components/Pill'
import { useAlertActions, type Alert, type AlertAction } from './api'
import { formatDateTime } from './format'

function Entry({ title, at, children }: { title: string; at: string; children?: React.ReactNode }) {
  return (
    <li className="relative border-l-2 border-line pb-4 pl-4 last:pb-0">
      <span
        className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-line-strong"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <b className="text-sm">{title}</b>
        <time dateTime={at} className="font-mono text-xs text-mute">
          {formatDateTime(at)}
        </time>
      </div>
      {children}
    </li>
  )
}

function ActionEntry({ action }: { action: AlertAction }) {
  const title = action.action === 'acknowledge' ? 'Acknowledged' : 'Closed'
  return (
    <Entry title={`${title} by ${action.user.display_name}`} at={action.at}>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-mute">
        <StatusPill status={action.from_status} />
        <span aria-label="to">→</span>
        <StatusPill status={action.to_status} />
      </div>
      {action.note && <p className="mt-1.5 mb-0 text-sm text-slate-ink">“{action.note}”</p>}
    </Entry>
  )
}

/** "Alert raised" (from the alert itself), then each audit row, oldest first (decision 10). */
export function AlertTimeline({ alert }: { alert: Alert }) {
  const actions = useAlertActions(alert.id)
  return (
    <Card>
      <CardHeader title="Timeline" />
      <CardBody>
        <ol className="m-0 list-none p-0">
          <Entry title="Alert raised" at={alert.created_at} />
          {actions.data?.map((action) => (
            <ActionEntry key={action.id} action={action} />
          ))}
        </ol>
        {actions.isError && (
          <p role="alert" className="mt-3 mb-0 text-sm text-red">
            {actions.error.message}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
