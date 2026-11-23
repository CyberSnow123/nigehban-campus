/**
 * The optional new-alert sound (Frontend.md §4). A local preference only, kept in this browser.
 * Storage can be missing or blocked (private windows, previews), so every access is guarded and
 * the default, on (as in the prototype), applies.
 */
const KEY = 'nigehban-alert-sound'

export function isAlertSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setAlertSoundOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Not saved; the toggle still works for this page.
  }
}

type AudioContextClass = typeof AudioContext

/** A short two-tone beep made with the Web Audio API, so no audio file is needed. */
export function playAlertSound(): void {
  try {
    const Context: AudioContextClass | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
    if (!Context) return
    const context = new Context()
    const gain = context.createGain()
    gain.connect(context.destination)
    gain.gain.value = 0.15
    const start = context.currentTime
    ;[880, 660].forEach((frequency, index) => {
      const tone = context.createOscillator()
      tone.type = 'sine'
      tone.frequency.value = frequency
      tone.connect(gain)
      tone.start(start + index * 0.18)
      tone.stop(start + index * 0.18 + 0.15)
    })
    window.setTimeout(() => void context.close(), 600)
  } catch {
    // The browser blocked audio (no user interaction yet) or has none; the toast still shows.
  }
}
