# Frontend (apps/web)

> React port of the approved prototype `prototype/dashboard.html` (at the repo root until Phase 1 moves it). The prototype is the **visual reference**: match its layout, colours and wording. Data shapes come from [Data-Contracts.md](Data-Contracts.md) via generated types.

## 1. Stack
React 18 · Vite · TypeScript (strict) · Tailwind CSS · React Router · TanStack Query · `openapi-typescript` (types in `src/lib/api/schema.d.ts`, never hand-edited) · Vitest + Testing Library. Packages via `bun`. Dev server: `bun dev` (port 5173, proxies `/api` to `:8000`).

## 2. Layout
```
apps/web/src/
  app/            App.tsx, router.tsx, providers (QueryClient, Auth)
  components/     ui primitives: Card, Button, Pill (type/status), StatTile, Modal, Table, EmptyState, DemoBadge, Snapshot
  layout/         AppShell (sidebar + topbar), MobileTabBar
  features/
    auth/         LoginPage, LoggedOutPage, useAuth, RequireAuth
    dashboard/    DashboardPage, CameraPreviewCard, TodayAlerts
    live/         LivePage, FeedTile (latest frame img, 1×1 / 2×2), RunControls
    alerts/       AlertsPage, AlertDetailPage, AlertCard, AlertActions, ActionTimeline
    history/      HistoryPage (filters, range, pagination)
    person/       PersonPage (alerts where track id is owner or carrier)
    settings/     SettingsPage (detection rules, theft check, cameras)
  lib/            api/ (client.ts fetch wrapper + schema.d.ts), format.ts (times, durations), constants.ts
  styles/         tokens.css (from prototype :root), index.css
```

## 3. Routes (one per prototype view)
| Route | Prototype view | Notes |
|---|---|---|
| `/login` | `v-login` | public |
| `/logged-out` | `v-logged-out` | public |
| `/` | `v-dashboard` | stat tiles, camera preview, today's alerts |
| `/live` | `v-live` | latest frame per running run, 1×1/2×2 toggle, start/stop run |
| `/alerts` | `v-alerts` | open alerts, status filter, search |
| `/alerts/:id` | `v-alert` | snapshot, facts, acknowledge, close with outcome, timeline |
| `/history` | `v-history` | closed and all alerts, type/status/range filters, pagination |
| `/runs/:runId/person/:trackId` | `v-person` | track IDs are per run |
| `/settings` | `v-app-settings` | editing is admin only, others read-only |

All routes except login and logged-out sit inside `RequireAuth` and `AppShell`. On a 401 the app clears the token and redirects to `/login`.

## 4. Data and polling
- Query keys: `['alerts', filters]`, `['alert', id]`, `['stats']`, `['runs']`, `['run', id]`.
- `refetchInterval: 3000` on stats, open alerts, alert detail and running runs (D-09). Pause when the tab is hidden. Stop polling a run once it's `completed|stopped|failed`.
- Live frame: `<img src="/api/runs/{id}/frame?t={tick}">` refreshed every 1 s, sent with the auth token (fetched as a blob).
- Mutations (`acknowledge`, `close`, `start/stop run`, `settings`) invalidate the related keys. No optimistic updates for alert status.
- **New-alert cue:** when `stats.active` increases, show a toast and the sidebar badge, plus an optional sound (a local preference kept in `localStorage`).

## 5. Design rules (from the prototype)
- Tokens: `--bg #f6f8fb`, `--card #fff`, `--line #e5e9f0`, `--ink #0f172a`, `--mute #64748b`, `--navy #0f172a`. Type colours: **red = abandoned**, **purple = possible theft**. Status colours: **amber = acknowledged**, **green = closed/resolved**, **blue = info**. Fonts: Inter, plus JetBrains Mono for IDs, times and ref codes.
- Shell: 270 px sidebar plus main column. **Under 760 px:** a bottom tab bar (Dashboard, Live, Alerts, History, Settings) and a single column.
- Wording: always **"Possible theft"**, never "Theft". Bags are only **handbag** or **backpack** (drop the prototype's "suitcase").
- Status labels: `active` → "Active", `acknowledged` → "Acknowledged", `resolved` → "Resolved", `false_alarm` → "False alarm", `authorised_pickup` → "Authorised pickup", `confirmed_theft` → "Confirmed theft".
- Close outcomes offered depend on type (Data-Contracts §2).
- **`is_demo = true` → show a `DemoBadge` ("Demo data") on the card, detail page and live tile. Never hide it.**
- Accessibility: focus-visible rings, 44 px touch targets, `aria-live` for new alerts, and never use colour alone (always include a text label).

## 6. Quality bar
- No `any`. API calls only go through `lib/api/client.ts`. Components never call `fetch` directly.
- Every list has loading, empty and error states.
- Tests: transition buttons per status, polling stop conditions, DemoBadge rendering, RequireAuth redirect.
