import { describe, expect, it } from 'vitest'

import { makeAlert } from '../../test/alerts'
import { duration } from '../alerts/format'
import { linkedBags, personRole, roleIn } from './personFacts'

const owns18 = makeAlert({ id: 'alt_01JD2Y0000000000000000000A', owner_track_id: 7 })
const carries31 = makeAlert({
  id: 'alt_01JD2Y0000000000000000000B',
  type: 'possible_theft',
  bag: { track_id: 31, class: 'backpack', bbox: [1, 2, 3, 4] },
  owner_track_id: 2,
  carrier_track_id: 7,
})
const owns18Again = makeAlert({ id: 'alt_01JD2Y0000000000000000000C', owner_track_id: 7 })

describe('person facts', () => {
  it('finds the role in each alert', () => {
    expect(roleIn(owns18, 7)).toBe('owner')
    expect(roleIn(carries31, 7)).toBe('carrier')
    expect(roleIn(carries31, 2)).toBe('owner')
    expect(roleIn(carries31, 99)).toBeNull()
  })

  it('names the overall role in the prototype words', () => {
    expect(personRole([owns18], 7)).toEqual({ label: 'Bag owner', tone: 'blu' })
    expect(personRole([carries31], 7)).toEqual({ label: 'Carrier', tone: 'pur' })
    expect(personRole([owns18, carries31], 7)).toEqual({
      label: 'Bag owner and carrier',
      tone: 'pur',
    })
    expect(personRole([], 7)).toBeNull()
  })

  it('lists each bag once per role, linked to the newest alert', () => {
    expect(linkedBags([carries31, owns18, owns18Again], 7)).toEqual([
      { key: '31-carrier', label: 'Backpack #31 (carried, not owner)', alertId: carries31.id },
      { key: '18-owner', label: 'Handbag #18 (owner)', alertId: owns18.id },
    ])
  })
})

describe('duration', () => {
  it.each([
    [null, undefined],
    [45.4, '45 s'],
    [60, '1 min'],
    [130, '2 min 10 s'],
    [3600, '1 h'],
    [3900, '1 h 5 min'],
  ])('%s s -> %s', (seconds, text) => {
    expect(duration(seconds)).toBe(text)
  })
})
