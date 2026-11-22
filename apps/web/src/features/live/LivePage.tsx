import { useState } from 'react'

import { Pill } from '../../components/Pill'
import { PageHeader } from '../../components/PageHeader'
import { SelectField, Segmented } from '../../components/controls'
import { TWO_COL } from '../../layout/grids'
import { usePageTitle } from '../../lib/usePageTitle'
import { BagInspector } from './BagInspector'
import { LiveFeeds, type FeedLayout } from './LiveFeeds'

const LAYOUTS = [
  { value: 'single', label: '1×1 Feed' },
  { value: 'grid', label: '2×2 Grid' },
] as const

export default function LivePage() {
  usePageTitle('Live Monitoring')
  const [layout, setLayout] = useState<FeedLayout>('single')

  return (
    <>
      <PageHeader
        title="Live Monitoring"
        badge={<Pill tone="gry">No runs</Pill>}
        subtitle="Real-time CCTV feeds with tracking overlays"
        right={
          <>
            <Segmented label="Feed layout" options={LAYOUTS} value={layout} onChange={setLayout} />
            {/* Cameras and runs come from the API in Phase 12. */}
            <SelectField label="Camera" disabled defaultValue="">
              <option value="">No cameras yet</option>
            </SelectField>
          </>
        }
      />
      <div className={TWO_COL}>
        <LiveFeeds layout={layout} />
        <BagInspector />
      </div>
    </>
  )
}
