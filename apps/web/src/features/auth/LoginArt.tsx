import { Card } from '../../components/Card'
import { Pill } from '../../components/Pill'

/** Camera illustration from the prototype's login page. Decorative. */
function CameraArt() {
  return (
    <svg viewBox="0 0 400 300" aria-hidden="true" className="h-auto w-full">
      <defs>
        <linearGradient id="login-art-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#cbd5e1">
        <circle cx="200" cy="170" r="70" />
        <circle cx="200" cy="170" r="105" strokeDasharray="4 6" />
        <path d="M60 230h70M270 110h80M90 120l40 20" />
      </g>
      <rect x="188" y="20" width="24" height="60" rx="6" fill="#cbd5e1" />
      <rect x="150" y="78" width="100" height="22" rx="8" fill="#94a3b8" />
      <path d="M128 100h144v34c0 40-32 66-72 66s-72-26-72-66z" fill="url(#login-art-body)" />
      <circle cx="200" cy="150" r="34" fill="#334155" />
      <circle cx="200" cy="150" r="16" fill="#0f172a" />
      <circle cx="206" cy="144" r="5" fill="#93c5fd" />
      <path d="M200 184l-70 100h140z" fill="#93c5fd" opacity=".18" />
    </svg>
  )
}

function Feature({ label, title }: { label: string; title: string }) {
  return (
    <Card className="p-3.5">
      <small className="text-xs text-mute">{label}</small>
      <b className="block text-sm font-semibold">{title}</b>
    </Card>
  )
}

/** Left panel of the login card. Hidden under 760 px, as in the prototype. */
export function LoginArt() {
  return (
    <aside className="hidden flex-col gap-[18px] border-r border-line bg-wash p-7 tab:flex">
      <div className="flex flex-wrap justify-between gap-2.5">
        <Pill tone="grn">AI surveillance suite</Pill>
        <Pill tone="gry">Campus node</Pill>
      </div>
      <CameraArt />
      <div className="grid grid-cols-2 gap-4">
        <Feature label="Campus optical AI" title="Real-time object tracking" />
        <Feature label="Telemetry link" title="Person-bag association" />
      </div>
      <p className="mt-auto mb-0 border-t border-line pt-3.5 text-[13px] text-mute">
        Live security shield active
      </p>
    </aside>
  )
}
