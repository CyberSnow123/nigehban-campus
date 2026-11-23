# Phase 08: Dashboard, History, Person, polling
Branch: `feature/phase-08-dashboard-history-person` (from `main`, which contains Phase 7) · Status: done, merged into `main` on 2026-11-23 with the owner's approval (decisions 1-4 approved 2026-11-23) · Owner: Farooq khan

## Goal
Finish the read-side screens and make them live with 3 s polling (D-09). The Dashboard, History and Person pages built in Phase 5 get real API data, and a new alert shows a toast, the sidebar badge and an optional sound within about 3 s, without a reload. Nothing in the pages' layout changes, except for the History bar additions in decision 4.

## Decisions taken while planning
| # | Unclear point | Decision |
|---|---|---|
| 1 | History tiles, phase-05 gap 5 **(approved)** | New read model **`HistoryStats`** `{ total, false_alarms, avg_response_s: float \| null }` from `GET /api/stats/history?days=1\|7\|30&type=`. It counts closed alerts with `occurred_at` in the range. **Response** is the time from `created_at` to the first operator action: `acknowledged_at`, or `closed_at` when the alert was closed straight from `active`. `null` (shown as "—") when no alert in the range has an action. The tiles follow the selected range and type. The first tile's label follows the range: "Alerts in last 24 hours" / "Alerts this week" / "Alerts in last 30 days". The value is shown as "2 min 10 s". |
| 2 | People and Bags tracked, phase-05 gap 1 **(approved)** | **Kept as "—"** (`aria-label="Not available yet"`), and so are the feed chips. No contract change. The gap moves to Phase 11/12 together with gap 2, where a `RunState` read model can carry live track counts. |
| 3 | New-alert cue **(approved)** | `Stats` gains **`latest_alert: { id, ref_code, type, camera_name } \| null`** (the newest alert by `occurred_at desc, id desc`). The first value loaded is a baseline and gives no toast. After that, a different `id` gives a toast "New possible theft alert SEC-2026-012-T at CAM 03", with a link to the alert, and the optional sound. This replaces "when `stats.active` increases" in Frontend.md §4, which misses a new alert if an acknowledge cancels it out within the same poll. |
| 4 | History filters **(approved)** | History lists **closed alerts only** (`status=closed`). The bar keeps the prototype's type segment and range select, and adds an **Outcome** select (All outcomes, Resolved, False alarm, Authorised pickup, Confirmed theft) and the same "Search: … ×" note pill as Alerts. URL: `/history?type=&outcome=&range=&q=&page=`. On `/history`, the top-bar search stays on History. On any other page it goes to `/alerts`, as now. |
| 5 | What "today" means | Midnight to midnight in the campus timezone, a new API setting `campus_timezone` (default `Asia/Karachi`), so the counts don't depend on the server's or the browser's clock. "Today" is decided by `occurred_at` for `today_*`, and by `closed_at` for `closed_today`. |
| 6 | Stats query | `services/stats_service.py` makes one aggregate `SELECT` with `count(*) FILTER (WHERE …)` for the alert counts, one count over `runs` (`status = 'running'`) and one `SELECT … LIMIT 1` for `latest_alert`. Demo alerts are counted. They are shown everywhere with their badge, so leaving them out would make the tiles disagree with the lists. |
| 7 | Dashboard tiles | **Active alerts** = `stats.active`, with the prototype's pill row: "n abandoned" and "n possible theft" come from the dashboard's active-alert list, which is already loaded (decision 9), and "All clear" shows at 0. **Active cameras** stays "—" until Phase 12 (there is no cameras endpoint yet). |
| 8 | "Today's alerts" donut | Segments: Active = `stats.active`, Acknowledged = `stats.acknowledged`, Resolved = `stats.closed_today`. Total = their sum. That means everything still open, plus what was closed today: the operator's shift view. The card title stays "Today's alerts". `Stats` doesn't change for this. |
| 9 | Dashboard alert cards | `useAlerts({ status: 'active', page_size: 5 })`, newest first, built as `ActiveAlertSummary`: title "Bag #18 · CAM 01", the time, and the text from `narrative.ts` (Phase 7). It reuses the Phase 5 empty text. No new "View all" control is added. |
| 10 | Polling | `refetchInterval: 3000` on `['stats']`, every `['alerts', …]` list on the Alerts page and Dashboard, `['alert', id]` and `['alert', id, 'actions']`. History, Person and `['stats', 'history', …]` poll too, but every 15 s, since past alerts change rarely. React Query's default `refetchIntervalInBackground: false` pauses polling when the tab is hidden, and it refetches on focus. A poll keeps the previous data while it loads (`keepPreviousData`), so rows don't flicker. A failed poll keeps the last data and shows no error until a reload fails too. |
| 11 | Shell status | `useShellStatus()` reads `['stats']`: `openAlerts = stats.open_total` feeds the sidebar and mobile Alerts badge and the bell dot (hidden at 0). `hasLiveRun = stats.running_runs > 0` now comes for free, so the Phase 12 TODO goes away. The `['stats']` query lives in `features/stats/api.ts`, and the shell mounts it once, so every page shares one poll. |
| 12 | Toast | A small `components/Toast.tsx` plus `layout/useNewAlertToast.ts`, rendered into the existing `aria-live` region in `AppShell` with the prototype's `.toast` look (navy, bottom right, above the mobile tabs under 760 px). It is shown for 6 s, longer than the prototype's 2.6 s, because it carries a link. It closes on click or Esc. Several new alerts at once give one toast: "3 new alerts", linking to `/alerts?status=active`. |
| 13 | Alert sound | `lib/alertSound.ts` plays a short two-tone beep through the Web Audio API, so no audio file is needed. The preference is `localStorage['nigehban-alert-sound']`, default **on** as in the prototype, wrapped in try/catch. The Settings "Alert sound" toggle is enabled and saves at once. It is only a local preference, so it doesn't wait for the Phase 12 Save button. If the browser blocks audio before the user has interacted with the page, the sound is skipped silently. |
| 14 | Person page data | `useAlerts({ run_id, person: trackId, page_size: 100 })`. **Role pill:** "Owner" (red), "Carrier" (purple) or "Owner and carrier", from the alerts. **Last seen card:** the newest alert's snapshot (`useAlertSnapshot`), with tag "CAM 01 — Main Library" and footer "Last alert 14:32". The wording says "last alert", not "last sighting", because we only know alert times. **Profile:** Status = the newest alert's status pill, Last seen = its time, Camera, Location, Linked bags = distinct "Bag #n" links to their alerts. **Table:** Alert (ref link), Type, Role pill, Bag, When, Status, "View →". Zero alerts, or a `422` for a malformed `run_id`, shows the Phase 5 "Unknown person" card, because without run telemetry (gap 2) an untracked ID can't be told apart from one with no alerts. The page has no `/api/runs/{id}` call yet (Phase 9/12). |
| 15 | Nav highlight (phase-05 decision 3) | `/alerts/:id` highlights **History** when the loaded alert is closed, and **Alerts** otherwise (also while it loads). The "← Back" link follows the same rule. The Person page still highlights Alerts. |
| 16 | History table | `page_size: 20`. Columns as built in Phase 5: Date & time (`occurred_at`, date over time), Alert ID (ref link + `DemoBadge`), Type pill, Bag (amber pill), Camera (+ location), Outcome = status pill, "View". Empty text: "No records for this filter." Changing a filter resets the page to 1 (same `useAlertFilters` rule). |
| 17 | Alerts page tiles | Unchanged (phase-07 decision 7). They now poll with the list, so they move with new alerts too. |

### Changed while building
| # | Change | Why |
|---|---|---|
| 3 | `latest_alert` is the alert the API **stored** last (`created_at desc, id desc`), not the newest by `occurred_at`. | Found in the browser check: a dev alert stamped later than "now" stayed on top, so new alerts never became "latest" and no toast showed. Events from recorded footage can also carry an older `occurred_at`. Data-Contracts §5 and the test say so. |
| 7 | The "n abandoned" / "n possible theft" pills come from two small list counts (`status=active&type=…&page_size=1`), not from the 5-card list. | The card list holds at most 5 alerts, so counting it would be wrong once more are active. |
| 10 | History's list key is `['alerts', 'history', filters]`, and `from` is worked out when the request is made. | Putting `from = now − days` in the key made a new key on every render. It still starts with `alerts`, so actions reload it. |
| 12 | The toast region is labelled "Notifications" (`role="status"`). | The page has other status regions, so tests and screen readers need to tell this one apart. |
| 14 | The Person page follows the prototype's own wording: the header pill reads "Bag owner", "Carrier" or "Bag owner and carrier"; the table's role pills are Owner (blue) and Carrier (purple); Status reads "Seen in past alerts" (grey), the prototype's status for a person known only from alerts; linked bags read "Handbag #18 (owner)" / "(carried, not owner)". With no alert naming the track, the card says "No alert in this run involves this person." | Closer to the prototype (D-14) than a status pill copied from the newest alert. |
| 15 | The detail page's Back link also follows the rule ("Back to History" for a closed alert). | It matched the highlighted nav item. |
| — | Search understands the forms the top bar's placeholder promises: `person 12` / `Person #12` / `P12` / `P-07` (owner or carrier), `bag 31` / `Bag #31` / `Handbag #18` (bag, and its class when named), and `theft` / `abandoned` (type). The parser is `services/alert_search.py`. The input has the prototype's tooltip "Try: Person #12, person 2, P7, Bag #31, library, theft". | Owner review after the phase: the placeholder said "Person #12, Bag #31", but only a bare number matched, so those searches found nothing. |
| — | `lib/urlFilters.ts` (`pick`, `pageNumber`, `useFilterUpdater`) is shared by Alerts and History. `SearchNotePill` moved out of `AlertsTable`. `tzdata` is a direct API dependency. | One set of URL rules. Windows has no system timezone database. |

## Plan
**Contracts first**
1. `Data-Contracts.md` §5: add `Stats.latest_alert` (`LatestAlert`) and the new `HistoryStats`, with the "today" and "response" definitions (decisions 1, 3, 5).
2. `nigehban_contracts/alerts.py`: `LatestAlert`, `Stats.latest_alert: LatestAlert | None`, `HistoryStats`. Export them, and add examples and tests (non-negative counts, `avg_response_s >= 0` or `null`).

**API (apps/api)**
3. `core/settings.py`: `campus_timezone: str = "Asia/Karachi"`, checked with `zoneinfo` at startup. Add it to `.env.example`.
4. `services/stats_service.py`: `today_bounds(now, tz)`, `dashboard_stats(db, now) -> Stats` and `history_stats(db, now, days, type) -> HistoryStats` (decisions 1, 5, 6). The clock is passed in, so tests can fix it.
5. `schemas/stats.py`: `HistoryStatsQuery` (`days` in {1, 7, 30}, default 7; optional `type`), validated as a dependency.
6. `routers/stats.py`: `GET /api/stats` → `Stats`, `GET /api/stats/history` → `HistoryStats`. Both need a user. Wire them into `main.py`.
7. Tests:
   - `test_stats.py`: every counter against seeded alerts in each status; today's edges across midnight in Asia/Karachi (an alert at 23:59 and one at 00:01 local); `closed_today` uses `closed_at`; `running_runs`; `latest_alert` order and `null` on an empty DB; no token gives 401.
   - `test_history_stats.py`: each range and type; only closed alerts count; average response with acknowledge-then-close, close-from-active and a mix; `null` when nothing is in the range; a bad `days` gives 422.
   - End to end: ingest a fake event, and `/api/stats` shows the new `latest_alert` and `active + 1`.

**Web (apps/web)**
8. `bun run gen:api`.
9. `features/stats/api.ts`: `useStats()` (`['stats']`, 3 s) and `useHistoryStats(days, type)` (`['stats', 'history', days, type]`, 15 s). Move `unwrap`, `ApiFailure` and `retryOnce` from `features/alerts/api.ts` into `lib/api/query.ts`, so both features share them. Add the polling intervals to `useAlerts` / `useAlert` / `useAlertActions` through an `interval` option (decision 10).
10. Shell: `useShellStatus()` from `useStats()` (decision 11). `components/Toast.tsx`, `layout/useNewAlertToast.ts` (decisions 3, 12), `lib/alertSound.ts` (decision 13). Mount them in `AppShell`. Enable the Settings sound toggle (`CamerasCard.tsx`).
11. Dashboard: `DashboardStats` (Active alerts + pill row), `ActiveAlertsList` fed by `useAlerts` (decision 9), `TodayAlertsCard` from stats (decision 8). `CameraPreviewCard` and `CurrentTargetCard` stay as they are.
12. History: split `HistoryPage.tsx` into `HistoryStats.tsx`, `HistoryBar.tsx` (segment, outcome, range, search pill) and `HistoryTable.tsx` (rows, loading, error, Pager), plus `useHistoryFilters.ts` (URL state, `range` → `from`). Make the top-bar search page-aware (decision 4).
13. Person: `features/person/usePersonAlerts.ts` (role, newest alert, linked bags as pure helpers with tests), then fill `PersonPage` (role pill, unknown state), `PersonLastSeenCard`, `PersonProfileCard` and `PersonAlertsTable` (decision 14).
14. Nav highlight for `/alerts/:id` (decision 15) in `navItems.tsx` / `Sidebar.tsx` / `MobileTabBar.tsx`.
15. Tests (with the `fetch` stub in `test/helpers.tsx` and fake timers):
   - The tiles and donut render from a stubbed `Stats`. "All clear" shows at 0.
   - A changed `latest_alert.id` on the next poll shows one toast with a link, and the baseline load shows none. Two new alerts give "2 new alerts". The sound plays only when the preference is on.
   - The badge follows `open_total`, and is hidden at 0.
   - History: the filters change the request query (`status=closed`, `from`, `type`, `outcome`, `q`), paging works, the tiles follow the range, and the label changes with the range.
   - Person: the role pill for owner, carrier and both; the unknown state on zero alerts; the linked bags.
   - The nav shows History for a closed alert.
   - "Possible theft" wording, and never a bare "Theft", on the Dashboard, History, Person and in the toast.

## Contract / doc changes
- `Data-Contracts.md` §5: `Stats.latest_alert`, `HistoryStats`, and the "today" and "response" definitions. `packages/contracts`: the models, the examples and the tests.
- `Backend.md` §3: `GET /api/stats` (fields, timezone) and `GET /api/stats/history`. §2: `stats_service`. The `campus_timezone` setting.
- `Frontend.md` §4: the polling table (3 s and 15 s), the new-alert cue from `latest_alert`, the toast, the sound key and the shared `lib/api/query.ts`. §3: History's URL and filters, the Person data rules, and the nav highlight.
- `Folder-Structure.md`: `routers/stats.py`, `services/stats_service.py`, `schemas/stats.py`, `features/stats/`, `features/history/*`, `components/Toast.tsx`, `lib/alertSound.ts`, `lib/api/query.ts`.
- `phase-05.md`: gap 1 "deferred to Phase 11/12 (decided in Phase 8)", and gap 5 "decided in Phase 8: `HistoryStats.avg_response_s`".
- `master-roadMap-plan.md`: add "gap 1 from phase-05" to Phase 12's carry-over line.
- No migration (`campus_timezone` is a setting, not a column).

## Verification
```
uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && bun run gen:api && git diff --exit-code src/lib/api
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
```
Runtime (`/verify`): seed the DB, then start the API and the web app. Log in as `operator` and keep the Dashboard open. Run `scripts/post_fake_event.py --type possible_theft`. Within about 3 s, without a reload, check that the Active alerts tile and its pill row, the donut and the Alerts badge go up, that a toast names the new alert and links to it, and that the beep sounds. Turn the sound off in Settings, post another event, and check there is a toast but no sound. Acknowledge the alert in a second tab, and check the first tab's donut moves from Active to Acknowledged within 3 s. Hide the tab and check in the API log that polling stops. On `/history`, try each range, type, outcome and a search, and check the tiles, the label and paging. Open a closed alert and check the nav highlights History. Open an Owner and a Carrier link and check the role pill, the snapshot, the profile and the table. Open `/runs/x/person/999` and check the Unknown person card. Repeat at 390 px (the toast sits above the bottom tabs).

## Acceptance
- [x] Every prototype view except Live and Settings works on real API data (Settings only gains the working sound toggle)
- [x] Posting a fake event updates the Dashboard counters, the badge and the toast within about 3 s without a reload (2.5 s measured in Edge)
- [x] Polling pauses while the tab is hidden (0 requests in 10 s hidden, polling again once shown)
- [x] Gaps 1 and 5 are recorded as decided in phase-05.md and the roadmap

## What changed (filled at the end)
- **Contracts:** `LatestAlert`, `Stats.latest_alert` and `HistoryStats`, with examples and tests. `Data-Contracts.md` §5 defines "today", "response" and "latest".
- **API added:** `routers/stats.py` (`GET /api/stats`, `GET /api/stats/history`), `services/stats_service.py`, `schemas/stats.py`. **Changed:** `core/settings.py` (`campus_timezone`, checked at startup), `main.py`, `pyproject.toml` (`tzdata`), `.env.example`.
- **Web added:** `lib/api/query.ts`, `lib/urlFilters.ts`, `lib/alertSound.ts`, `components/Toast.tsx`, `layout/{useNewAlertToast.ts,NewAlertToast.tsx,useActiveNavKey.ts}`, `features/stats/api.ts`, `features/alerts/SearchNotePill.tsx`, `features/history/{api.ts,useHistoryFilters.ts,HistoryStats,HistoryBar,HistoryTable}`, `features/person/{personFacts.ts,usePersonAlerts.ts}`. **Changed:** `features/alerts/{api.ts (polling, isClosed, shared helpers),AlertsStats,AlertsTable,AlertDetailPage,alertRows,format (duration),useAlertFilters}`, the Dashboard sections, `HistoryPage`, the Person page and cards, `layout/{AppShell,Sidebar,MobileTabBar,Topbar,useShellStatus}`, `settings/CamerasCard` (sound toggle).
- **Tests:** 691 Python tests passed, 10 skipped (was 664 / 10). New: `test_stats.py` (each counter, the midnight edges in Asia/Karachi, `closed_today` by `closed_at`, `latest_alert` order and `null`, history ranges and types, average response with acknowledge-then-close and close-from-active, 401/422) and a timezone settings test. 150 web tests pass (was 123). New: toast (baseline, new alert, several at once, sound off, ×, first alert on an empty system), badge, Dashboard tiles/cards/donut, History (rows, tiles and label, filters in the request and URL, paging, top-bar search on History), closed alert → History nav, `historyParams`, person facts, `duration`. Older page tests use a shared `emptyApi` stub, because the shell now polls `/api/stats`. ruff, eslint, `tsc` and `vite build` are clean, and the generated API types are current.
- **Runtime check (dev DB on :5433, uvicorn :8000, Vite :5173, Edge driven by Playwright from the scratchpad), 33/33 checks:** after `post_fake_event.py --type possible_theft`, the toast "New possible theft alert SEC-2026-017-T at CAM 01." showed 2.5 s after the alert was stored, with the Active alerts tile, its pills and the badge each up by one and one beep. An acknowledge through the API showed on the open Dashboard in 1.6 s. With the sound switched off in Settings, the next toast showed with no beep, and × closed it. History: "Alerts this week" → "Alerts in last 30 days", Average response "1 h 12 min", only closed outcomes listed, outcome and type filters, top-bar search kept on History with its filters. A closed alert highlighted History. Person #12 (carrier) showed the Carrier pill, "Last seen on CAM 01 — …" with the snapshot, "Seen in past alerts" and "Handbag #18 (carried, not owner)"; an unknown track showed its card. At 390 px no page scrolls sideways and the toast sits above the bottom tabs. No console errors. This left several more demo runs (`running`) and alerts in the dev DB, so the Live Monitoring dot is now on there.
- **Decisions taken:** the 17 above, plus "Changed while building". None change `Decisions.md`; the contract rules are in Data-Contracts §5.
- **Known gaps carried forward:**
  - People tracked, Bags tracked, Active cameras and the feed chips still show "—" (Phase 12, gaps 1 and 2).
  - A toast's "N new alerts" count comes from today's totals, so near midnight, or for alerts from footage dated another day, it can fall back to 1. The newest alert is always named correctly.
  - The Person page shows alerts only, because there is no per-run track telemetry. "Last seen" means the last alert.
  - History tiles follow the range and type, not the outcome or the search.
  - `post_fake_event.py` leaves its demo runs `running`, so `running_runs` grows in the dev DB unless `--finish` is passed.
