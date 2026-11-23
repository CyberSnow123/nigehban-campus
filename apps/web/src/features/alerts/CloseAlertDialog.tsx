import { useId, useState } from 'react'

import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { STATUS_PILL } from '../../lib/constants'
import type { CloseOutcome } from './api'

export const NOTE_MAX = 500 // Data-Contracts §6 (CloseRequest.note)

const TITLE: Record<CloseOutcome, string> = {
  resolved: 'Resolve this alert?',
  false_alarm: 'Mark as a false alarm?',
  authorised_pickup: 'Mark as an authorised pickup?',
  confirmed_theft: 'Confirm theft?',
}
const HELP: Record<CloseOutcome, string> = {
  resolved: 'The situation was dealt with, for example the owner came back for the bag.',
  false_alarm: 'Nothing was wrong. The detection was mistaken.',
  authorised_pickup: 'A friend or a member of staff took the bag with permission.',
  confirmed_theft: 'You have checked and the bag was taken by someone who is not its owner.',
}

interface CloseAlertDialogProps {
  outcome: CloseOutcome | null
  pending: boolean
  onCancel: () => void
  onConfirm: (note: string) => void
}

/** Asks before closing an alert with an outcome, with an optional note (phase-07 decision 9). */
export function CloseAlertDialog({ outcome, pending, onCancel, onConfirm }: CloseAlertDialogProps) {
  const [note, setNote] = useState('')
  const noteId = useId()
  const close = () => {
    setNote('')
    onCancel()
  }
  return (
    <Modal
      open={outcome !== null}
      onClose={close}
      title={outcome ? TITLE[outcome] : ''}
      footer={
        <>
          <Button onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={outcome === 'confirmed_theft' ? 'pur' : 'dark'}
            disabled={pending}
            onClick={() => onConfirm(note.trim())}
          >
            {pending ? 'Saving…' : `Close as ${outcome ? STATUS_PILL[outcome].label : ''}`}
          </Button>
        </>
      }
    >
      {outcome && <p className="mt-0 mb-4 text-sm text-slate-ink">{HELP[outcome]}</p>}
      <label htmlFor={noteId} className="mb-1.5 block text-sm font-semibold">
        Note <span className="font-normal text-mute">(optional)</span>
      </label>
      <textarea
        id={noteId}
        value={note}
        maxLength={NOTE_MAX}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        className="w-full rounded-lg border border-line bg-card p-3 text-sm"
      />
      <p className="mt-1 mb-0 text-right font-mono text-xs text-mute" aria-live="polite">
        {note.length} / {NOTE_MAX}
      </p>
    </Modal>
  )
}
