import { Link } from 'react-router-dom'

import { Toast } from '../components/Toast'
import type { AlertType } from '../lib/constants'
import type { NewAlertNotice } from './useNewAlertToast'

const KIND: Record<AlertType, string> = {
  abandoned_bag: 'abandoned bag',
  possible_theft: 'possible theft',
}

/** "New possible theft alert SEC-2026-012-T at CAM 03", with a link to it. */
export function NewAlertToast({
  notice,
  onClose,
}: {
  notice: NewAlertNotice
  onClose: () => void
}) {
  const { latest, count } = notice
  const many = count > 1
  return (
    <Toast onClose={onClose}>
      <p className="m-0">
        {many ? (
          <>
            <b>{count} new alerts.</b> The newest is a {KIND[latest.type]} alert at{' '}
            {latest.camera_name}.
          </>
        ) : (
          <>
            New {KIND[latest.type]} alert <span className="font-mono">{latest.ref_code}</span> at{' '}
            {latest.camera_name}.
          </>
        )}
      </p>
      <Link
        to={many ? '/alerts?status=active' : `/alerts/${latest.id}`}
        onClick={onClose}
        className="mt-1.5 inline-block font-semibold underline underline-offset-2"
      >
        {many ? 'View active alerts →' : 'View alert →'}
      </Link>
    </Toast>
  )
}
