# Frontend (apps/web)

> React port of the approved prototype `prototype/dashboard.html`. The prototype is the **visual reference**: match its layout, colours and wording. Data shapes come from [Data-Contracts.md](Data-Contracts.md) via generated types.

## 1. Stack
React 19 · Vite · TypeScript 6 (strict) · Tailwind CSS v4 (CSS-first `@theme`, no config file) · ESLint + Prettier · React Router · TanStack Query · `openapi-typescript` (types in `src/lib/api/schema.d.ts`, never hand-edited) · Vitest + Testing Library. Packages via `bun`. Dev server: `bun dev` (port 5173, proxies `/api` to `:8000`).

## 2. Layout
```
apps/web/src/
  app/            App.tsx, router.tsx, providers (QueryClient, Auth)
  components/     ui primitives, one concern per file: Card (+CardHeader/CardBody), Button (+LinkButton, IconButton), Pill (+TypePill, StatusPill, DemoBadge), StatTile, KeyValue, PageHeader (+BackLink), controls (Segmented, SelectField, Toggle, RangeField, SwitchRow), charts (ProgressBar, Donut), Feed (Feed, FeedCard, FeedChip, Snapshot), Table, Pager, Modal (native <dialog>), Toast, EmptyState, Logo, icons
  layout/         AppShell, Sidebar, Topbar, MobileTabBar, navItems, grids (page grid classes), useShellStatus (badge numbers, from ['stats']), useNewAlertToast + NewAlertToast, useActiveNavKey (a closed alert highlights History)
  features/
    auth/         LoginPage, LoggedOutPage, ForgotPasswordPage, ResetPasswordPage, AuthProvider + useAuth, RequireAuth, RequireAdmin
    stats/        api.ts (useStats: the shared 3 s poll; useHistoryStats)
    dashboard/    DashboardPage, DashboardStats, ActiveAlertsList, TodayAlertsCard, CameraPreviewCard, CurrentTargetCard
    live/         LivePage, FeedTile (latest frame img, 1×1 / 2×2), RunControls
    alerts/       AlertsPage, AlertDetailPage, AlertActions, CloseAlertDialog, AlertTimeline, SearchNotePill, api.ts (queries, mutations), narrative.ts, format.ts, alertRows.tsx
    history/      HistoryPage, HistoryStats, HistoryBar, HistoryTable, useHistoryFilters, api.ts (useHistoryAlerts)
    person/       PersonPage, PersonLastSeenCard, PersonProfileCard, PersonAlertsTable, usePersonAlerts, personFacts.ts (role, linked bags)
    settings/     SettingsPage (detection rules, theft check, cameras; the alert sound toggle)
  lib/            api/ (client.ts openapi-fetch wrapper, query.ts (ApiFailure, unwrap, retryOnce, POLL_MS, SLOW_POLL_MS), token.ts, openapi.json + schema.d.ts, generated), constants.ts (pill maps, role labels), cx.ts, urlFilters.ts (filters in the address), alertSound.ts, usePageTitle.ts, useAuthedImage.ts
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
| `/alerts/:id` | `v-alert` | snapshot, facts, acknowledge, close with outcome (confirm dialog with an optional note), timeline below the details card. Buttons follow `alert.next_statuses` using the prototype's set (Resolve for abandoned; Confirm theft and Authorised pickup for possible theft; Mark false alarm). No Reopen |
| `/history` | `v-history` | **closed** alerts only. `/history?type=&outcome=&range=1\|7\|30&q=&page=` (range default 7, 20 rows a page). Tiles from `/api/stats/history` follow range and type; the first tile's label follows the range. The top-bar search stays on History when you are on it |
| `/runs/:runId/person/:trackId` | `v-person` | track IDs are per run. Built from the person's alerts (`/api/alerts?run_id=&person=`): role pill "Bag owner" / "Carrier", last seen = newest alert's snapshot and camera, linked bags. No alert names the track → "No alert in this run involves this person" card |

`/alerts/:id` belongs to **History** in the nav (and its Back link goes there) once the alert is closed, as in the prototype.
| `/settings` | `v-app-settings` | editing is admin only, others read-only |

All routes except login and logged-out sit inside `RequireAuth` and `AppShell`. On a 401 to a request that carried a token, the app clears the token and redirects to `/login?next=<path>`; after login it returns to `next` (internal paths only). The login, forgot and reset calls never send a token, and their 401/422/429 are shown on the form (the server's own message, e.g. "Too many attempts. Please wait up to 60 seconds and try again.").

## 4. Data and polling
- **Token storage:** always in memory; the login checkbox "Remember this terminal session" also keeps it in `localStorage` (checked) or `sessionStorage` (unchecked). A stored token is verified with `GET /api/auth/me` before the app trusts it. Types come from `bun run gen:api` (`schema.d.ts` and `openapi.json` are committed, never hand-edited).
- Query keys: `['alerts', filters]`, `['alerts', 'history', filters]`, `['alert', id]`, `['stats']`, `['stats', 'history', days, type]`, `['runs']`, `['run', id]`.
- **Polling** (`lib/api/query.ts`): `POLL_MS = 3000` on `['stats']`, the Alerts and Dashboard lists, alert detail and its timeline, and running runs (D-09). `SLOW_POLL_MS = 15000` on History, its tiles and the Person page. React Query pauses polling while the tab is hidden and refetches on focus. Lists keep the previous data while they reload, and a failed poll keeps the last data on screen (the error shows only when nothing has loaded). Stop polling a run once it's `completed|stopped|failed`. `['stats']` is one shared query: the shell, the toast and the Dashboard read it.
- **Alert queries** (`features/alerts/api.ts`): keys `['alerts', params]`, `['alert', id]`, `['alert', id, 'actions']`, `['alert', id, 'snapshot']`. An action replaces `['alert', id]` and invalidates it and every `['alerts']` list. A 4xx is not retried; a server or network error is retried once. List filters and the page number live in the URL (`/alerts?type=&status=&q=&page=`). Read types are taken from the client's fetchers, not `components['schemas']`, because openapi-fetch turns the 4-number `bbox` tuple into `number[]`.
- **Images that need the token** (`lib/useAuthedImage.ts`): an `<img>` cannot send `Authorization`, so the snapshot is fetched through the client as a blob and shown as a data URL (cached, `staleTime: Infinity`). The live frame (Phase 12) uses the same hook with a refreshing key.
- Live frame: `/api/runs/{id}/frame` refreshed every 1 s through `useAuthedImage`.
- Mutations (`acknowledge`, `close`, `start/stop run`, `settings`) invalidate the related keys. No optimistic updates for alert status.
- **New-alert cue** (`layout/useNewAlertToast.ts`): the first `stats.latest_alert` is a baseline; after that a different `id` shows a toast ("New possible theft alert SEC-… at CAM 03", link to the alert; "N new alerts" linking to `/alerts?status=active` when today's count rose by more than one) for 6 s, closable with × or Esc, inside the `aria-live` region "Notifications". The sidebar/tab badge and bell dot show `stats.open_total` (hidden at 0). The sound is a two-tone Web Audio beep (`lib/alertSound.ts`), on by default, switched in Settings and kept in `localStorage['nigehban-alert-sound']`; blocked audio is skipped silently.

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
