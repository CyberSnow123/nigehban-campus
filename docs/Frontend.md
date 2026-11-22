# Frontend (apps/web)

> React port of the approved prototype `prototype/dashboard.html`. The prototype is the **visual reference**: match its layout, colours and wording. Data shapes come from [Data-Contracts.md](Data-Contracts.md) via generated types.

## 1. Stack
React 19 · Vite · TypeScript 6 (strict) · Tailwind CSS v4 (CSS-first `@theme`, no config file) · ESLint + Prettier · React Router · TanStack Query · `openapi-typescript` (types in `src/lib/api/schema.d.ts`, never hand-edited) · Vitest + Testing Library. Packages via `bun`. Dev server: `bun dev` (port 5173, proxies `/api` to `:8000`).

## 2. Layout
```
apps/web/src/
  app/            App.tsx, router.tsx, providers (QueryClient, Auth)
  components/     ui primitives, one concern per file: Card (+CardHeader/CardBody), Button (+LinkButton, IconButton), Pill (+TypePill, StatusPill, DemoBadge), StatTile, KeyValue, PageHeader (+BackLink), controls (Segmented, SelectField, Toggle, RangeField, SwitchRow), charts (ProgressBar, Donut), Feed (Feed, FeedCard, FeedChip, Snapshot), Table, Pager, Modal (native <dialog>), EmptyState, Logo, icons
  layout/         AppShell, Sidebar, Topbar, MobileTabBar, navItems, grids (page grid classes), useShellStatus (the one place the shell's badge numbers come from)
  features/
    auth/         LoginPage, LoggedOutPage, ForgotPasswordPage, ResetPasswordPage, AuthProvider + useAuth, RequireAuth, RequireAdmin
    dashboard/    DashboardPage, CameraPreviewCard, TodayAlerts
    live/         LivePage, FeedTile (latest frame img, 1×1 / 2×2), RunControls
    alerts/       AlertsPage, AlertDetailPage, AlertCard, AlertActions, ActionTimeline
    history/      HistoryPage (filters, range, pagination)
    person/       PersonPage (alerts where track id is owner or carrier)
    settings/     SettingsPage (detection rules, theft check, cameras)
  lib/            api/ (client.ts openapi-fetch wrapper, token.ts, openapi.json + schema.d.ts, generated), constants.ts (pill maps, role labels), cx.ts, usePageTitle.ts, format.ts (times, durations: Phase 7)
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
- Palette is fixed (D-14, with the dark theme added by D-15): every colour is a prototype `:root` value, plus the neutrals the prototype uses inline (`#f8fafc`, `#f1f5f9`, `#cbd5e1`, `#334155`, `#475569`, `#0b1220`, `#eef2f7`, `#10b981`, `#fecdd3`, `#e9d5ff`, `#eaf1ff`). All live in `styles/tokens.css`; do not add colours or use Tailwind's stock palette. Tokens: `--bg #f6f8fb`, `--card #fff`, `--line #e5e9f0`, `--ink #0f172a`, `--mute #64748b`, `--navy #0f172a`. Type colours: **red = abandoned**, **purple = possible theft**. Status colours: **amber = acknowledged**, **green = closed/resolved**, **blue = info**. Fonts: **IBM Plex Sans** for text and **IBM Plex Mono** for IDs, times, ref codes and figures, with tabular numerals.
- **Dark theme (D-15):** `:root[data-theme='dark']` in `styles/tokens.css` swaps every colour variable (plum background `#150d1b`, cards `#1f1527`, pink accent `#fb7185`). `index.html` sets `data-theme` before first paint from `localStorage` (`nigehban-theme`) or the OS setting; `lib/theme.ts` (`useTheme`) and `components/ThemeToggle.tsx` switch it. Use semantic classes (`bg-card`, `text-ink`, `bg-soft`, `text-on-solid` on solid red/purple fills); never `bg-white` or a hex value, or the dark theme breaks. The favicon is the shield mark (`public/favicon.svg`, plus a 32 px PNG and an Apple touch icon).
- **What may differ from the prototype (D-14):** typeface, spacing (4 px scale; 16 px between cards, 24 px between page sections), boxes (cards 12 px radius, 1 px border, no shadow; buttons, inputs and selects 8 px radius and at least 44 px tall; pills stay round) and tables (shaded header row, 13 px labels, row hover, mono IDs and times; under 760 px each row becomes a bordered card whose cells carry `data-label`). Everything else (views, sections, wording, icons, colours) is as in the prototype.
- **Breakpoints:** 760 px (sidebar to bottom tabs, single column, stacked tables) and 1100 px (tile grid 4 to 2, two-column layouts to one, settings 3 to 1), as `tab:` and `wide:` in `tokens.css`.
- **Sections without data:** still built, in place, with an empty state: a dash (`StatTile`, `KeyValue`), "No camera running", "No alerts yet". Controls whose action does not exist yet are disabled with a `title` naming the phase. Shell badges and dots stay hidden at 0. Never sample numbers (D-06).
- Shell: 270 px sidebar plus main column. **Under 760 px:** a bottom tab bar (Dashboard, Live, Alerts, History, Settings) and a single column.
- Wording: always **"Possible theft"**, never "Theft". Bags are only **handbag** or **backpack** (drop the prototype's "suitcase").
- Status labels: `active` → "Active", `acknowledged` → "Acknowledged", `resolved` → "Resolved", `false_alarm` → "False alarm", `authorised_pickup` → "Authorised pickup", `confirmed_theft` → "Confirmed theft".
- Close outcomes offered depend on type (Data-Contracts §2).
- **`is_demo = true` → show a `DemoBadge` ("Demo data") on the card, detail page and live tile. Never hide it.**
- Accessibility: focus-visible rings, 44 px touch targets (40 px compact buttons on desktop only), `aria-live` for new alerts, and never use colour alone (always include a text label). A "Skip to main content" link comes first. On a route change the page scrolls to the top and `<main>` takes focus (without scrolling it under the sticky topbar). Each route sets its `<title>` (`usePageTitle`). `prefers-reduced-motion` stops the blink and flow animations.

## 6. Quality bar
- No `any`. API calls only go through `lib/api/client.ts`. Components never call `fetch` directly.
- Every list has loading, empty and error states.
- Tests: transition buttons per status, polling stop conditions, DemoBadge rendering, RequireAuth redirect.
