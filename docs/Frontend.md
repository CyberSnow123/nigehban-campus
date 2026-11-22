# Frontend (apps/web)

> React port of the approved prototype `prototype/dashboard.html`. The prototype is the **visual reference**: match its layout, colours and wording. Data shapes come from [Data-Contracts.md](Data-Contracts.md) via generated types.

## 1. Stack
React 19 · Vite · TypeScript 6 (strict) · Tailwind CSS v4 (CSS-first `@theme`, no config file) · ESLint + Prettier · React Router · TanStack Query · `openapi-typescript` (types in `src/lib/api/schema.d.ts`, never hand-edited) · Vitest + Testing Library. Packages via `bun`. Dev server: `bun dev` (port 5173, proxies `/api` to `:8000`).

## 2. Layout
```
apps/web/src/
  app/            App.tsx, router.tsx, providers (QueryClient, Auth)
  components/     ui primitives: Card, Button, Pill (type/status), StatTile, Modal, Table, EmptyState, DemoBadge, Snapshot
  layout/         AppShell (sidebar + topbar), MobileTabBar
  features/
    auth/         LoginPage, LoggedOutPage, ForgotPasswordPage, ResetPasswordPage, AuthProvider + useAuth, RequireAuth, RequireAdmin
    dashboard/    DashboardPage, CameraPreviewCard, TodayAlerts
    live/         LivePage, FeedTile (latest frame img, 1×1 / 2×2), RunControls
    alerts/       AlertsPage, AlertDetailPage, AlertCard, AlertActions, ActionTimeline
    history/      HistoryPage (filters, range, pagination)
    person/       PersonPage (alerts where track id is owner or carrier)
    settings/     SettingsPage (detection rules, theft check, cameras)
  lib/            api/ (client.ts openapi-fetch wrapper, token.ts, openapi.json + schema.d.ts, generated), format.ts (times, durations), constants.ts
  styles/         tokens.css (from prototype :root), index.css
```

## 3. Routes (one per prototype view)
| Route | Prototype view | Notes |
|---|---|---|
| `/login` | `v-login` | public |
| `/logged-out` | `v-logged-out` | public. **Opening it ends the session** (token dropped, query cache cleared), so a Log out button only has to navigate here |
| `/forgot-password` | (new, from the prototype's "Forgot password?") | public. Email field; always shows the server's neutral message |
| `/reset-password?token=` | (new) | public. New password + confirm. The token is removed from the address bar on load and never stored |
| `/` | `v-dashboard` | stat tiles, camera preview, today's alerts |
| `/live` | `v-live` | latest frame per running run, 1×1/2×2 toggle, start/stop run |
| `/alerts` | `v-alerts` | open alerts, status filter, search |
| `/alerts/:id` | `v-alert` | snapshot, facts, acknowledge, close with outcome, timeline |
| `/history` | `v-history` | closed and all alerts, type/status/range filters, pagination |
| `/runs/:runId/person/:trackId` | `v-person` | track IDs are per run |
| `/settings` | `v-app-settings` | editing is admin only, others read-only |

All routes except login and logged-out sit inside `RequireAuth` and `AppShell`. On a 401 to a request that carried a token, the app clears the token and redirects to `/login?next=<path>`; after login it returns to `next` (internal paths only). The login, forgot and reset calls never send a token, and their 401/422/429 are shown on the form (the server's own message, e.g. "Too many attempts. Please wait up to 60 seconds and try again.").

## 4. Data and polling
- **Token storage:** always in memory; the login checkbox "Remember this terminal session" also keeps it in `localStorage` (checked) or `sessionStorage` (unchecked). A stored token is verified with `GET /api/auth/me` before the app trusts it. Types come from `bun run gen:api` (`schema.d.ts` and `openapi.json` are committed, never hand-edited).
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
