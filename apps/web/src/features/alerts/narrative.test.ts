import { describe, expect, it } from 'vitest'

import { makeAlert } from '../../test/alerts'
import { narrative } from './narrative'

describe('narrative', () => {
  it('describes an abandoned bag from its own measurements', () => {
    expect(narrative(makeAlert())).toBe(
      'A handbag (bag #18) was left at CAM 01, Main Library. Its owner, Person #2, moved away' +
        ' and did not come back for 65 s.',
    )
  })

  it('leaves out an unknown owner instead of guessing', () => {
    expect(narrative(makeAlert({ owner_track_id: null }))).toBe(
      'A handbag (bag #18) was left at CAM 01, Main Library. No owner was linked to it for 65 s.',
    )
  })

  it('describes a possible theft with the appearance score', () => {
    expect(narrative(makeAlert({ type: 'possible_theft' }))).toBe(
      'Person #12 picked up a handbag (bag #18) at CAM 01, Main Library while its owner,' +
        ' Person #2, had been away for 35 s. Appearance match with the owner: 18%.',
    )
  })

  it('never states a theft as a fact', () => {
    const text = narrative(makeAlert({ type: 'possible_theft' }))
    expect(text).not.toMatch(/\btheft\b|\bstole/i)
  })
})
