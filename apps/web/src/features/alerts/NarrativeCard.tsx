import { Card, CardBody } from '../../components/Card'
import { DocIcon } from '../../components/icons'

/** A short summary written from the alert's own measurements (`narrative.ts`). */
export function NarrativeCard({ text }: { text?: string }) {
  return (
    <Card>
      <CardBody className="flex items-start gap-3.5">
        <div className="grid size-11 flex-none place-items-center rounded-lg bg-blu-bg text-blu">
          <DocIcon className="size-5" />
        </div>
        <div>
          <b>Automated incident narrative</b>
          <p className="mt-1.5 mb-0 text-slate-ink">
            {text ?? 'The narrative is written from the alert’s measurements once the alert loads.'}
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
