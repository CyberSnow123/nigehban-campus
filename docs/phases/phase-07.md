# Phase 07: Alerts: list, detail, actions
Branch: `feature/phase-07-alerts` (from `main`, which now contains Phase 6; Phase 6 was merged after review on 2026-11-23) · Status: done (awaiting owner review/merge; decisions 1-2 approved 2026-11-23) · Owner: Farooq khan

## Goal
Operators see alerts, open one, acknowledge it and close it with an outcome that fits its type. Every action writes an audit row in the same transaction. The Alerts and Alert detail pages built in Phase 5 are filled with real API data. Nothing in their layout changes.

## Build and merge order (approved 2026-11-23)
`main` → `feature/phase-06-ingestion` → `feature/phase-07-alerts`, each committed on its own branch. The owner reviewed Phase 6 and it was merged into `main` before Phase 7 started, so this branch starts from `main`. It is merged after the owner's review.

## Decisions taken while planning
| # | Unclear point | Decision |
|---|---|---|
| 1 | "Reopen alert" (phase-05 gap 4) **(approved)** | **Left out.** Closed statuses stay terminal, as in the transition table, so the contract doesn't change. A wrong close is corrected by a new alert, not by rewriting history. Reopening can be added later as `closed → active` with its own audit action. |
| 2 | Which actions the UI offers **(approved)** | New read-model field `Alert.next_statuses: AlertStatus[]`, computed by the API from `ALLOWED_TRANSITIONS[(type, status)]`. The UI shows Acknowledge when the list has `acknowledged`, and the prototype's close buttons for the statuses it has (see "Changed while building"). The transition rules then live only in contracts, not in a copy in TypeScript. Changes Data-Contracts §5 first. |
| 3 | Rejected moves | A move the table doesn't allow (acknowledging twice, closing a closed alert, `confirmed_theft` on an abandoned alert) is `409 INVALID_TRANSITION`. A `CloseRequest` that fails validation (an open status as `outcome`, a note over 500 characters) is `422`. An unknown alert ID or one with the wrong prefix is `404`. |
| 4 | Concurrent actions | `alert_service` loads the alert with `SELECT … FOR UPDATE`, checks `can_transition`, updates the alert and inserts the `alert_actions` row, then commits. Two operators clicking at once: one wins and the other gets `409`. |
| 5 | Fields set by actions | Acknowledge sets `acknowledged_by` and `acknowledged_at`. Close sets `status` and `closed_at`. Closing straight from `active` is allowed and leaves `acknowledged_*` empty. `note` is stored on the action row only. |
| 6 | List filters | All of Backend §3 are built now, so Phase 8 only adds UI: `status` (one status, or `open` / `closed`), `type`, `camera_id`, `run_id`, `person` (track ID, matches owner or carrier, used with `run_id`), `q`, `from`, `to`, `is_demo`, `page` (from 1), `page_size` (default 20, max 100). Order: `occurred_at desc, id desc`. `q` matches `ref_code`, camera name and location (case-insensitive, `%` and `_` escaped). If `q` is a whole number, it also matches the bag, owner and carrier track IDs. Bad values are `422`. |
| 7 | Alerts page tiles | Total, Active, Acknowledged and Resolved come from the list's `total` with `page_size=1` and the matching `status`. That is four small queries and needs no new endpoint. "Resolved" counts the `resolved` status only. Phase 8's `/api/stats` doesn't replace them, because `Stats` has no all-time total. |
| 8 | Snapshot image | `GET /api/alerts/{id}/snapshot` needs a logged-in user, and an `<img>` can't send a Bearer token. A small hook, `useAuthedImage(url)`, fetches the image as a blob through the API client and shows it from an object URL, which it releases on unmount. Phase 12 reuses it for live frames. A missing file is `404`, and the card then shows "Snapshot not available". The API answers `Cache-Control: private, max-age=3600`, since a snapshot never changes. |
| 9 | Close dialog | Every close outcome (Resolve, Confirm theft, Authorised pickup, Mark false alarm) opens the Phase 5 `Modal`. It names the outcome, has an optional note (500 characters, with a counter) and buttons to confirm or cancel. Acknowledge has no dialog. The buttons are disabled while the request runs, and a `409` shows "This alert was already updated by someone else" and reloads the alert. |
| 10 | Timeline | Below the details card (Frontend.md §3). The first entry is "Alert raised" (`created_at`, from the alert itself, not an audit row). Then each `alert_actions` row, oldest first: action, from → to status pills, who, when and the note. |
| 11 | Narrative | `features/alerts/narrative.ts`, a pure function of the alert's fields, with a test for each type. Abandoned: "A handbag (bag #18) was left at CAM 01, Main Library. Its owner, Person #2, moved away and did not come back for 65 s." Possible theft: "Person #12 picked up a handbag (bag #18) at CAM 03 while its owner, Person #2, had been away for 35 s. Appearance match with the owner: 18%." Unknown values are left out of the sentence, never guessed. |
| 12 | Thresholds on the detail page | The "Threshold" row and the "needs N%" label need `config.json` values, which reach the API in Phase 12 (`GET /api/settings`). Until then they show "—". The "Separation" row is always highlighted on an abandoned alert, because the alert only fires once the threshold is passed. |
| 13 | Generated types (carried from Phase 5) | `AlertType` and `AlertStatus` in `lib/constants.ts` become `components['schemas']['EventType']` and `['AlertStatus']` from the regenerated schema, and the `TODO(phase-07)` goes. A type test fails if a generated enum value has no pill mapping. |
| 14 | Web data layer | `features/alerts/api.ts`: `useAlerts(filters)`, `useAlert(id)`, `useAlertActions(id)`, `useAcknowledge(id)`, `useCloseAlert(id)`. Query keys `['alerts', filters]`, `['alert', id]`, `['alert', id, 'actions']`. A successful action invalidates all three. The filters come from the existing `useAlertFilters` (URL query). The page shows 50 rows and the `Pager` when there are more. Phase 8 adds polling. |
| 15 | Table cells | Alert ID = `ref_code` plus a `DemoBadge` when `is_demo`. Bag = class pill and "Bag #18". Owner and Carrier link to `/runs/{run_id}/person/{track_id}`, or "—" when empty. Camera = name, with location below. Time = local date and time. Action = "View →" to `/alerts/{id}`. |

### Changed while building
| # | Change | Why |
|---|---|---|
| 2 | The UI keeps the prototype's button set, each shown only when `next_statuses` includes it: Resolve on an abandoned alert, Confirm theft and Authorised pickup on a possible theft, Mark false alarm on both. A possible theft is never offered "Resolve" in the UI, although the API allows it. | The prototype's theft card has no Resolve button, and its views are kept as they are (D-14). The rule itself still comes only from the API. |
| 8 | The image is shown as a **data URL** made inside the query function, not an object URL. | Making an object URL needs an effect that sets state, which ESLint 7's hook rules flag, and React StrictMode's double effect would revoke the URL while it is still in use. A data URL needs no cleanup and is cached with the query. It uses about a third more memory for an image of at most 2 MB. |
| 9 | A `409` shows the server's own message, e.g. "This alert is already acknowledged.", then reloads the alert. | It says what actually happened, which is more useful than a generic line. |
| 14 | The hooks are `useAlerts`, `useAlertCount`, `useAlert`, `useAlertActions`, `useAlertSnapshot` and one `useAlertMove` (acknowledge or close). A 4xx is never retried; a server or network error is retried once. The read types come from the client's fetchers. | React Query's default of three retries made an error take about 7 s to show. openapi-fetch turns the 4-number `bbox` tuple into `number[]`, so `components['schemas']['Alert']` does not match what the client returns. |
| 15 | The ref code is also a link to the alert, and the Time cell shows the date over the time (the full date and time is its tooltip). | In the browser at 1440 px the table was 52 px wider than its card and the Action column was cut off. With these it fits. On narrower laptops the table still scrolls sideways (the Phase 5 design), and the ref-code link keeps each alert one click away. |

## Plan
**Contracts first**
1. `Data-Contracts.md` §5: add `next_statuses` to `Alert`, and note the list filters and the `409` / `422` / `404` rules for actions.
2. `nigehban_contracts/alerts.py`: `Alert.next_statuses: list[AlertStatus]`, plus a helper `next_statuses(type, status)` in `transitions.py` with a fixed order (acknowledged, resolved, false_alarm, authorised_pickup, confirmed_theft). Update the examples fixture and the tests.

**API (apps/api)**
3. `schemas/alerts.py`: `AlertListQuery` (decision 6), validated as a dependency.
4. `services/alert_service.py` (started in Phase 6): `to_alert(row, camera, ack_user) -> Alert`, `to_action(row, user) -> AlertAction`, `acknowledge(db, alert_id, user)`, `close(db, alert_id, user, body)` (decisions 3-5).
5. `services/alert_query.py`: builds the filtered, paged `SELECT` (one join to cameras, one left join to users) and the count. It stays separate from the actions, so neither file grows too big.
6. `routers/alerts.py`: `GET /api/alerts`, `GET /api/alerts/{id}`, `GET /api/alerts/{id}/snapshot` (through `storage`, never outside `DATA_DIR`), `GET /api/alerts/{id}/actions`, `POST …/acknowledge`, `POST …/close`. All need a user. Responses `Page[Alert]`, `Alert`, JPEG, `list[AlertAction]`, `Alert`, `Alert`, with error responses declared for OpenAPI. Wire into `main.py`.
7. Tests:
   - `test_alert_transitions.py`: every pair in `ALLOWED_TRANSITIONS` for both types through the API (allowed gives 200 plus one audit row with the right from and to; not allowed gives 409 and no row), acknowledging twice, closing twice, a theft-only outcome on an abandoned alert, `acknowledged_*` and `closed_at` set, and a parallel acknowledge from two clients gives one 200 and one 409.
   - `test_alerts_list.py`: each filter, `open`/`closed`, `person` matching owner and carrier, `q` on ref, camera and a track number, `%` in `q`, paging and the total, order, bad values give 422, no token gives 401.
   - `test_alerts_detail.py`: detail shape against the contract, `next_statuses` per status, the snapshot bytes and header, a missing file 404, an unknown ID 404, actions oldest first.
   - An end-to-end test: post an event through ingest, then list, acknowledge, close as `false_alarm` and read the timeline.

**Web (apps/web)**
8. `bun run gen:api`. Switch `lib/constants.ts` to the generated types (decision 13).
9. `features/alerts/api.ts` (decision 14), `lib/useAuthedImage.ts` (decision 8), `features/alerts/narrative.ts` (decision 11).
10. Fill the Phase 5 sections: `AlertsStats` (decision 7), `AlertsTable` (rows, loading, error, Pager), the `AlertDetailPage` header (ref, type, status pill, DemoBadge, "Triggered …"), `SnapshotCard`, `CarrierCompareCard` (score from `owner_match`, Match / Not the owner pill), `NarrativeCard`, and `AlertDetailsCard` (rows per type, actions from `next_statuses`, closed note).
11. New: `CloseAlertDialog.tsx` (decision 9) and `AlertTimeline.tsx` (decision 10).
12. Tests (with the existing `fetch` stub in `test/helpers.tsx`): rows render from a stubbed page; filters change the request query; the demo badge shows; detail shows the abandoned and the theft rows; buttons follow `next_statuses` (no theft outcomes on an abandoned alert, none on a closed one); acknowledge calls the API and reloads; the close dialog sends the outcome and note; a 409 shows its message; the timeline order; the narrative for each type; "Possible theft" and never a bare "Theft" anywhere on both pages.

## Contract / doc changes
- `Data-Contracts.md` §5: `Alert.next_statuses`. `packages/contracts`: the field, the helper and the tests.
- `Backend.md` §3 (filter details, the response of each action, snapshot caching) and §5 (row lock, 409 vs 422 vs 404).
- `Frontend.md` §3 (the close dialog and timeline on `/alerts/:id`) and §4 (`useAuthedImage`, the query keys).
- `Folder-Structure.md`: `services/alert_query.py`, `schemas/alerts.py`, `features/alerts/{api,narrative}.ts`, `lib/useAuthedImage.ts`.
- `phase-05.md` gap 4: record "left out, decided in Phase 7".
- No migration.

## Verification
```
uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && bun run gen:api && git diff --exit-code src/lib/api
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
```
Runtime (`/verify`): seed the DB, start the API and web, then run `scripts/post_fake_event.py --type possible_theft`. In the browser, log in as `operator`. On `/alerts`, check that the new alert and the seed alerts show with the Demo data badge, then try the type, status and search filters. Open the alert and check the snapshot, the theft rows, the "Possible theft" wording and the narrative. Acknowledge it, then close it as `false_alarm` with a note, and check the timeline and that no buttons are left. Open an abandoned alert and check that only Resolve and Mark false alarm are offered. Check in psql that there is one `alert_actions` row per action. Repeat at 390 px.

## Acceptance
- [x] "Possible theft" wording everywhere (web tests check there is no bare "Theft" on the list, the detail page or in the narrative)
- [x] The outcomes offered depend on the alert type (API `next_statuses` and the UI buttons, checked in tests and in the browser)
- [x] An audit row for every action, written in the same transaction
- [x] Every allowed and rejected transition is covered by API tests (every type × status × target cell)
- [x] Ingest a fake event, then see it in Alerts, acknowledge it, close it as `false_alarm` and see the timeline, all in the browser (Edge via Playwright)

## What changed (filled at the end)
- **Contracts:** `Alert.next_statuses` and `next_statuses(type, status)` with a fixed order. The example fixture, and tests for every type and status cell. `Data-Contracts.md` §5 explains the field and the action rules (409 / 422 / 404, no reopening).
- **API added:** `routers/alerts.py` (six routes), `services/alert_query.py` (filters, paging, detail, audit trail, snapshot file, contract mapping), `schemas/alerts.py` (`AlertListQuery`). **Changed:** `services/alert_service.py` (`acknowledge`, `close` under a row lock, with the audit row in the same transaction), `core/errors.py` (`invalid_transition`, `ALERT_ERROR_RESPONSES`), `main.py`.
- **Web added:** `features/alerts/{api,format,narrative}.ts`, `alertRows.tsx`, `AlertActions.tsx`, `CloseAlertDialog.tsx`, `AlertTimeline.tsx`, `lib/useAuthedImage.ts`, `test/alerts.ts`. **Changed:** `AlertsStats`, `AlertsTable` (rows, loading, error, Pager), `useAlertFilters` (page in the URL, reset to 1 when a filter changes), `AlertDetailPage` (load, 404 page), `SnapshotCard`, `CarrierCompareCard`, `AlertDetailsCard`, `lib/constants.ts` (generated enum types, `BAG_LABEL`), `test/helpers.tsx` (records the query string), and the Phase 5 page tests (path-aware mocks, real alert data).
- **Docs:** `Data-Contracts.md` §5, `Backend.md` §2/§3/§5, `Frontend.md` §2/§3/§4, `Folder-Structure.md`, `phase-05.md` gap 4, and the roadmap's Phase 7 carry-over line.
- **Tests:** 664 Python tests passed and 10 were skipped (was 554). The skipped cells are abandoned alerts starting in a theft-only status, which the database forbids. The tests cover every transition cell through the API, a parallel acknowledge (one 200, one 409), each list filter and paging, detail, snapshot and an end-to-end ingest-to-timeline flow. 123 web tests pass (was 105). ruff, eslint, `tsc` and `vite build` are clean.
- **Runtime check (dev DB on :5433, uvicorn :8000, Vite :5173, Edge driven by Playwright from the scratchpad):** logged in as `operator`. `/alerts` showed 11 rows and the tiles 11 / 5 / 1 / 1, and the Possible theft filter gave 6 rows. Opened a fresh mock theft alert (`SEC-2026-011-T`, from `post_fake_event.py`): the "Demo data" badge, snapshot image, theft rows, "Below match threshold" with 18%, and the narrative all showed. Acknowledge, then Mark false alarm with a note: the timeline showed "Alert raised / Acknowledged by … / Closed by …" with the note, and no buttons were left. An active abandoned alert offered only Acknowledge, Resolve and Mark false alarm. At 390 px neither the list nor the detail page scrolls sideways. No console errors. This left that alert closed as `false_alarm` in the dev DB, plus one more demo run.
- **Decisions taken:** the 15 above, plus "Changed while building". None change `Decisions.md` (the "no reopen" rule is in Data-Contracts §5).
- **Known gaps carried forward:**
  - Thresholds ("Threshold", "needs N%") show "—" until Phase 12 exposes `config.json` through `GET /api/settings`.
  - "Bag movement" has no field in the event contract and shows "—". It would need a contract change, perhaps in Phase 17.
  - No polling yet: a new alert appears on Refresh or on navigation (Phase 8).
  - The Alerts tiles make four small list requests. Phase 8's `/api/stats` covers the dashboard but has no all-time total.
  - Between about 760 and 1400 px the alerts table scrolls sideways (the Phase 5 design), now with the ref-code link as a shortcut.
  - The snapshot card's tag shows the video time (`t = 42.0 s`) instead of the prototype's resolution, which the API does not know.
