import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { STATUS_PILL, TYPE_PILL, type AlertStatus, type AlertType } from '../lib/constants'
import { LinkButton } from './Button'
import { Donut, ProgressBar } from './charts'
import { Segmented, Toggle } from './controls'
import { Snapshot } from './Feed'
import { KeyValue } from './KeyValue'
import { Modal } from './Modal'
import { Pager } from './Pager'
import { DemoBadge, StatusPill, TypePill } from './Pill'
import { StatTile } from './StatTile'
import { Table } from './Table'

describe('pills', () => {
  it('label every alert type, and never call a possible theft a bare "Theft"', () => {
    const types: AlertType[] = ['abandoned_bag', 'possible_theft']
    render(
      <>
        {types.map((type) => (
          <TypePill key={type} type={type} />
        ))}
      </>,
    )
    expect(screen.getByText('Abandoned')).toBeTruthy()
    expect(screen.getByText('Possible theft')).toBeTruthy()
    expect(screen.queryByText(/^Theft$/i)).toBeNull()
    expect(TYPE_PILL.possible_theft.tone).toBe('pur')
    expect(TYPE_PILL.abandoned_bag.tone).toBe('red')
  })

  it('label every status with the Frontend.md wording', () => {
    const labels: Record<AlertStatus, string> = {
      active: 'Active',
      acknowledged: 'Acknowledged',
      resolved: 'Resolved',
      false_alarm: 'False alarm',
      authorised_pickup: 'Authorised pickup',
      confirmed_theft: 'Confirmed theft',
    }
    for (const [status, label] of Object.entries(labels) as Array<[AlertStatus, string]>) {
      const { unmount } = render(<StatusPill status={status} />)
      expect(screen.getByText(label)).toBeTruthy()
      expect(STATUS_PILL[status].label).toBe(label)
      unmount()
    }
  })

  it('DemoBadge says "Demo data"', () => {
    render(<DemoBadge />)
    expect(screen.getByText('Demo data')).toBeTruthy()
  })
})

describe('StatTile', () => {
  it('shows a dash with an accessible reason when there is no value', () => {
    render(<StatTile label="Active alerts" icon={<span />} />)
    expect(screen.getByRole('img', { name: 'Not available yet' })).toHaveTextContent('—')
  })

  it('shows the value, and 0 counts as a value', () => {
    render(<StatTile label="Active alerts" value={0} suffix="/ 4 online" icon={<span />} />)
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('/ 4 online')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Not available yet' })).toBeNull()
  })
})

describe('KeyValue', () => {
  it('shows a dash for a missing value', () => {
    render(<KeyValue label="Owner" />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})

describe('Table', () => {
  const columns = [
    { key: 'id', label: 'Alert ID' },
    { key: 'action', label: 'Action', align: 'right' as const },
  ]

  it('labels each cell for the stacked mobile layout', () => {
    render(
      <Table
        caption="Alerts"
        columns={columns}
        rows={[{ id: 'a', cells: { id: 'SEC-1', action: <button type="button">View</button> } }]}
        emptyText="none"
      />,
    )
    expect(screen.getByRole('table', { name: 'Alerts' })).toBeTruthy()
    expect(screen.getByText('SEC-1')).toHaveAttribute('data-label', 'Alert ID')
    expect(screen.getByRole('button', { name: 'View' }).closest('td')).toHaveAttribute(
      'data-label',
      'Action',
    )
  })

  it('has one look for loading, error and empty', () => {
    const { rerender } = render(
      <Table caption="Alerts" columns={columns} rows={[]} emptyText="Nothing here." loading />,
    )
    expect(screen.getByText('Loading…')).toBeTruthy()
    rerender(<Table caption="Alerts" columns={columns} rows={[]} emptyText="x" error="Boom." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Boom.')
    rerender(<Table caption="Alerts" columns={columns} rows={[]} emptyText="Nothing here." />)
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here.')
  })
})

describe('Pager', () => {
  it('disables Previous on the first page and Next on the last, and reports page changes', async () => {
    const onPage = vi.fn()
    const { rerender } = render(
      <Pager page={1} pageCount={3} shown={5} total={12} onPage={onPage} />,
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onPage).toHaveBeenCalledWith(2)
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')

    rerender(<Pager page={3} pageCount={3} shown={2} total={12} onPage={onPage} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 2 of 12 records')
  })
})

describe('Snapshot', () => {
  it('says why there is no image', () => {
    const { rerender } = render(<Snapshot alt="frame" />)
    expect(screen.getByText('No snapshot')).toBeTruthy()
    rerender(<Snapshot alt="frame" state="loading" />)
    expect(screen.getByText('Loading snapshot…')).toBeTruthy()
    rerender(<Snapshot alt="frame" state="error" />)
    expect(screen.getByText('Snapshot unavailable')).toBeTruthy()
  })

  it('falls back to "Snapshot unavailable" when the image fails to load', () => {
    render(<Snapshot alt="frame" src="/broken.jpg" />)
    const img = screen.getByRole('img', { name: 'frame' })
    img.dispatchEvent(new Event('error'))
    return screen.findByText('Snapshot unavailable')
  })
})

describe('controls', () => {
  it('Segmented marks the chosen option and reports changes', async () => {
    const onChange = vi.fn()
    render(
      <Segmented
        label="Layout"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'One' },
          { value: 'b', label: 'Two' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'One', pressed: true })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Two' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('Toggle is a keyboard-operable switch', async () => {
    const user = userEvent.setup()
    render(<Toggle label="Alert sound" />)
    const toggle = screen.getByRole('switch', { name: 'Alert sound' })
    expect(toggle).not.toBeChecked()
    await user.tab()
    await user.keyboard(' ')
    expect(toggle).toBeChecked()
  })
})

describe('charts', () => {
  it('ProgressBar clamps to 0-100', () => {
    render(<ProgressBar value={140} tone="red" label="Progress" />)
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('Donut lists every segment and totals them', () => {
    render(
      <Donut
        segments={[
          { label: 'Active', value: 2, color: 'red' },
          { label: 'Resolved', value: 3, color: 'green' },
        ]}
      />,
    )
    expect(screen.getByRole('img', { name: '5 alerts in total' })).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Resolved')).toBeTruthy()
  })

  it('Donut with no data still renders a ring', () => {
    render(<Donut segments={[{ label: 'Active', value: 0, color: 'red' }]} />)
    expect(screen.getByRole('img', { name: '0 alerts in total' })).toBeTruthy()
  })
})

describe('LinkButton', () => {
  it('is a real link with the button look', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/live" variant="dark">
          Open live view
        </LinkButton>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Open live view' })).toHaveAttribute('href', '/live')
  })
})

describe('Modal', () => {
  it('opens and closes with the `open` prop', () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => undefined} title="Close alert">
        Body
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(
      <Modal open onClose={() => undefined} title="Close alert">
        Body
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Close alert' })).toBeTruthy()
  })

  it('reports a close (Esc in a browser) and a click on the backdrop', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Close alert">
        Body
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    dialog.dispatchEvent(new Event('close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
