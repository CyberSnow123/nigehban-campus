import { useCallback, useEffect, useState } from 'react'

import { useStats, type LatestAlert } from '../features/stats/api'
import { isAlertSoundOn, playAlertSound } from '../lib/alertSound'

export interface NewAlertNotice {
  /** Changes with every notice, so effects and the toast restart. */
  key: number
  /** How many alerts arrived since the last poll (at least 1). */
  count: number
  latest: LatestAlert
}

interface Seen {
  id: string | null
  today: number
}

const SHOW_MS = 6000

/**
 * Watches `stats.latest_alert` (phase-08 decision 3). The first value is the baseline and gives no
 * notice; after that a different alert ID gives one, and plays the sound if it is on. The count
 * comes from today's totals, so several alerts within one poll give one notice.
 */
export function useNewAlertToast() {
  const stats = useStats().data
  const latest = stats?.latest_alert // undefined until the first load
  const today = (stats?.today_abandoned ?? 0) + (stats?.today_theft ?? 0)
  const [seen, setSeen] = useState<Seen | null>(null)
  const [notice, setNotice] = useState<NewAlertNotice | null>(null)

  // Adjusting state while rendering (not in an effect) when the polled value changes.
  if (latest !== undefined) {
    const id = latest?.id ?? null
    if (seen === null) {
      setSeen({ id, today })
    } else if (id !== seen.id || today !== seen.today) {
      setSeen({ id, today })
      if (latest && id !== seen.id) {
        setNotice({ key: (notice?.key ?? 0) + 1, count: Math.max(1, today - seen.today), latest })
      }
    }
  }

  const noticeKey = notice?.key
  useEffect(() => {
    if (noticeKey === undefined) return
    if (isAlertSoundOn()) playAlertSound()
    const timer = window.setTimeout(() => setNotice(null), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [noticeKey])

  const dismiss = useCallback(() => setNotice(null), [])
  return { notice, dismiss }
}
