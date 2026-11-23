# Phase 05: Frontend shell (prototype port)
Branch: `feature/phase-05-frontend-shell` (from `main`, which now contains Phase 4) · Status: done (awaiting team review/merge) · Owner: Farooq khan

## Goal
Port the prototype's app shell, design system and **the full layout of every page** to React. Every view and every section in `prototype/dashboard.html` is built in its prototype position, with its prototype heading, columns and controls. Sections whose data arrives later show an honest empty state ("—", "No alerts yet", "No camera running"), never sample numbers and never a missing block. Later phases fill these layouts with data; they don't redesign them.

## Design rule for this phase (team instruction)
**Keep:** the prototype's layout, views, sections, wording, icons and **its exact colour palette** (every hex value in its `:root` and inline styles; no new colours).
**Improve only:** the typeface, the spacing, the boxes (cards, inputs, buttons) and the tables. The changes:

| Area | Prototype | Phase 5 |
|---|---|---|
| Typeface | Inter + JetBrains Mono | **IBM Plex Sans** (400/500/600/700) + **IBM Plex Mono** (400/600), from Google Fonts. Mono stays for IDs, times, ref codes and figures. `font-variant-numeric: tabular-nums` on numbers, so columns and counters don't jitter. |
| Spacing | Mixed values (14/16/18/20/22/28 px) | A 4 px scale with a few steps: 8 inside controls, 16 between cards, 24 between page sections, 20 or 24 card padding. One header rhythm on every page: h1 → 4 → subtitle → 24 → content. |
| Boxes | 18 px card radius, soft shadow, 12 px controls | Cards: 12 px radius, 1 px `--line` border, no shadow. Buttons, inputs and selects: 8 px radius, the same 44 px height. Card header bars (title + right `small`) get the same bottom-bordered strip that the prototype's `cam-h` uses, so every card reads the same. Pills keep their full-round shape. |
| Tables | Tracked caps header, 14 px rows, plain | Header row on `#f8fafc`, sentence-case 13 px labels, sticky inside its card. 12/16 px cell padding. Row hover `#f8fafc`. Mono, tabular IDs and times. Action column right-aligned. Under 760 px each row becomes a bordered mini-card with a label/value grid (an improved prototype `.stack`). Loading, empty and error rows have one look. |

All neutrals used above (`#f8fafc`, `#f1f5f9`, `#cbd5e1`, `#334155`, `#475569`, `#0b1220`) already appear in the prototype.

## Section inventory (nothing is skipped)
Each section is built in Phase 5. "Filled by" is the phase that puts real data in it. **Gap** means no current contract or roadmap task supplies the data; it is listed under *Gaps raised* for the team to decide. The section is still built.

**Login** (`/login`, restyle of the Phase 4 page)
| Section | Phase 5 | Filled by |
|---|---|---|
| Left art panel: two pills, the CCTV-camera illustration, "Campus optical AI / Real-time object tracking" and "Telemetry link / Person-bag association" cards, "Live security shield active" footer | **Restored** (Phase 4 dropped it). Hidden under 760 px, as in the prototype | static |
| Pills "AI surveillance suite v2.4", "Node #01-Central"; footer figure "99.98% up" | Untrue as written, so: the version pill reads just "AI surveillance suite" (no invented version number), the node pill reads "Campus node", and the uptime figure is left out (phase-04 decision 9) | static |
| Form (logo, heading, username, password with eye and Forgot link, error line, Remember checkbox, submit with arrow) | Kept from Phase 4, new type and boxes | done |
| Notice "Authorised campus security personnel only. Demo prototype: all data is sample data." | First sentence kept; the second is dropped because the data is not sample data | static |
| Footer © line | kept | static |

**Logged out** (`/logged-out`): logo, heading, session end time, green pill, "Log in again", footer. All exist already and only get restyled.

**Shell**
| Section | Phase 5 | Filled by |
|---|---|---|
| Sidebar brand, 5 nav links with icons | built | static |
| Alerts nav badge, Live green dot | built, hidden until there is data (no fake "2") | 8 (badge), 12 (dot) |
| User block: avatar initials, name, role, log-out icon | built from `useAuth()` | done |
| Topbar search, bell with red dot, avatar + name | built; search goes to `/alerts?q=` | 7 (search), 8 (dot) |
| Mobile bottom tabs (≤760 px) with Alerts badge | built | 8 (badge) |
| Toast region (`aria-live`) | built, unused | 8 |

**Dashboard** (`/`), "Dashboard" · "Live overview of campus cameras and unattended bags"
| Section | Phase 5 | Filled by |
|---|---|---|
| Stat tiles: Active cameras (n / total online), People tracked, Bags tracked, Active alerts + pill row (n abandoned, n possible theft, All clear) | 4 tiles, showing "—" | Active cameras 12 (`Camera.is_active`, running runs); Active alerts 8 (`stats`); **People/Bags tracked: Gap 1** |
| Camera preview card: header (rec dot, "CAM — location (Live)", resolution/FPS tag, Online pill), 16:9 feed, footer chips (tracked persons, target bag, model + FPS), "Open live view" | frame with "No camera running" | 12 (frame, FPS); **chip counts: Gap 1** |
| "Current target" card: owner, distance, status pill, separation time, threshold, threshold-progress bar | frame with "No bag is being watched" | **Gap 2** (live tracking state) |
| Active alert cards (red/purple, type pill, time, bag · camera, sentence, "View alert →") | list with the prototype's own empty text "No active alerts. Everything is with its owner." | 8 |
| "Today's alerts" donut (Active / Acknowledged / Resolved, total) | donut ring with 0s, legend rows | 8 (`stats`) |

**Live Monitoring** (`/live`), "Live Monitoring" + "System online" pill · "Real-time CCTV feeds with tracking overlays"
| Section | Phase 5 | Filled by |
|---|---|---|
| Header controls: 1×1 Feed / 2×2 Grid segmented control, camera select | built and working (local state); camera list empty | 12 |
| "System online" pill | built with neutral "No runs" until runs exist | 12 |
| 1×1 feed card (header, feed, footer: tracking count, state, model + FPS + ms) and 2×2 grid ("All cameras", tap a tile to open it) | both layouts built with empty feeds | 12 (frames, FPS); **counts and state: Gap 2** |
| Bag inspector card: title + camera, "Current detection state" box with pill and message, key-value rows, "Open alert" / "Dismiss false alarm" or "Nothing to act on for this camera." | built, empty state | **Gap 2**; the buttons reuse Phase 7 actions |

**Security Alerts** (`/alerts`), "Security Alerts" · "All abandoned-bag and possible-theft alerts"
| Section | Phase 5 | Filled by |
|---|---|---|
| Stat tiles: Total alerts, Active, Acknowledged, Resolved | 4 tiles, "—" | 7/8 |
| Table bar: All / Abandoned / Possible theft segment, search note pill with ×, status select (All, Active, Acknowledged, Resolved / closed), Refresh button | built; filters update the URL query | 7 |
| Table: Alert ID, Type, Bag (+ description), Owner (person link), Carrier (person link), Camera (+ location), Time, Status, Action "View →" | columns built, empty row "No alerts match these filters." | 7 |

**Alert detail** (`/alerts/:id`)
| Section | Phase 5 | Filled by |
|---|---|---|
| "← Back to Alerts", h1 "Alert {ref} — Possible theft / Abandoned bag" + status pill, "REF … · Triggered …" | built with the `:id` from the URL, "Loading…" state | 7 |
| Snapshot card: header (camera icon, camera — location snapshot (time), resolution tag), image, footer (detection zone, AI confidence) | `Snapshot` frame | 7 |
| Possible theft only: "Is the carrier the owner?" with a Match/Not-the-owner pill, owner and carrier appearance cards, match score bar "needs N%" | built, shown by type | score bar 7 (`owner_match`) / 17 (real values); **owner/carrier crops: Gap 3** |
| "Automated incident narrative" card | built | 7 (sentence built from alert fields) |
| "Alert details" card with check code (THEFT_CHECK / ABANDON_CHECK), key-value rows per type (the "Separation" row highlighted when over the threshold), actions: Acknowledge, Resolve, or Confirm theft + Authorised pickup, "Mark false alarm" link, closed note | built; buttons disabled until Phase 7 | 7 |
| "Reopen alert" button on a closed alert | **not offered: Gap 4** (closed statuses are terminal in the transition table) | — |
| Action timeline | not in the prototype; Phase 7 adds it below the details card (Frontend.md §3) | 7 |

**Person** (`/runs/:runId/person/:trackId`)
| Section | Phase 5 | Filled by |
|---|---|---|
| Back link, h1 "Person #n" + role pill, "Track ID P-nn · appearance fingerprint saved for re-identification" | built; subtitle without the fingerprint claim until Phase 17 | 8 |
| "Last seen on CAM — location" card (feed, location, "Track in Live Monitoring") | built, empty feed | 8 (last alert's snapshot); "Track in Live" 12 |
| "Alerts involving Person #n" table: Alert, Type, Role (Owner/Carrier pill), Bag, When, Status, Action | built, empty row | 8 |
| Profile card: appearance image, Status pill, Last seen, Camera, Location, Linked bags, note "Faces are blurred. People are identified only by tracking ID and appearance, not by name." | built; the note is kept verbatim | 8; **image: Gap 3** |
| Unknown person card ("No person with this ID has been tracked…") | built | 8 |

**History** (`/history`), "History" · "Past alerts and how they were resolved"
| Section | Phase 5 | Filled by |
|---|---|---|
| Stat tiles: Alerts this week, Average response, False alarms | 3 tiles, "—" | 8; **Average response: Gap 5** |
| Table bar: All / Abandoned / Possible theft segment, date-range select | built (range options 1/7/30 days, from roadmap Phase 8) | 8 |
| Table: Date & time, Alert ID, Type, Bag (amber pill), Camera (+ location), Outcome pill, Action "View" | built, empty row | 8 |
| Pager: "Showing x of y records", Previous, page numbers, Next | built (`Pager` primitive) | 8 |

**Settings** (`/settings`), "Settings" · "Detection rules, theft check, cameras and notifications"
| Section | Phase 5 | Filled by |
|---|---|---|
| "Detection rules": Near distance (body-heights, ~cm), Owner confirmed after (frames, ~s), Abandon after (s), as sliders with output | built, disabled, no value shown | 12 (`association.near_ratio`, `association.min_frames`, `abandon.threshold_s`) |
| "Theft check": "Alert when a non-owner carries a bag" toggle, Appearance match threshold slider, "Allow authorised pickup by staff" toggle | built, disabled | slider 12 (`theft.owner_match_threshold`); **both toggles: Gap 6** |
| "Cameras and notifications": one row per camera with Online/Off and a toggle, Alert sound toggle, Email alerts toggle | built; camera list empty; sound toggle disabled | cameras 12 (`is_active`); sound 8 (local preference); **Email alerts: Gap 7** |
| Buttons: Save changes, Reset to defaults, Log out (red text) | Save/Reset disabled; Log out works now | 12 |

## Gaps raised (for the team; nothing is cut in Phase 5)
These sections are built but have no data source in the current contracts. Each needs a decision **in the phase that fills it** (contracts first), or an explicit decision to keep the section as an empty state.
1. **People tracked / Bags tracked** (dashboard tiles, feed chips): `Stats` has no such fields. Could come from run frame telemetry (Phase 10/12).
2. **Live tracking state** (dashboard "Current target", Live inspector, feed footer state): there is no contract for per-frame track and association state. Phase 11/12 would need a `RunState` read model.
3. **Appearance crops** (theft comparison cards, person profile image): no crop is stored. Phase 17 (OwnerMatcher) creates owner crops. Until then, a placeholder frame "Appearance images arrive with the owner fingerprint (FYP-2)".
4. **Reopen alert**: the prototype offers it, but the transition table makes closed statuses terminal. Either add `closed → active` (a contract change) or leave it out. Phase 5 leaves it out. **Decided in Phase 7: left out**; closed statuses stay terminal.
5. **Average response** (History): it can be derived from `acknowledged_at - created_at`, but `Stats` has no field for it. Phase 8 decides.
6. **Theft toggles** ("Alert when a non-owner carries a bag", "Allow authorised pickup by staff"): there are no `config.json` keys for them. Phase 12 decides (e.g. `theft.enabled`).
7. **Email alerts**: no alert-email feature in scope (Phase 4 mail is for password resets only). Phase 12 decides.

## Decisions taken while planning
| # | Point | Decision |
|---|---|---|
| 1 | No fake numbers | Shell badges and dots stay hidden at 0. Tiles show "—" with `aria-label="Not available yet"`. Feeds show "No camera running". Pills that state untrue facts are reworded (see Login). This follows D-06 and phase-04 decision 9. |
| 2 | Role label | `operator` → "Security operator", `admin` → "Administrator", in place of "Security Control Room". |
| 3 | Nav | React Router `NavLink` instead of `<button data-go>`, giving real links and `aria-current="page"`. `/alerts/:id` highlights Alerts (History when Phase 8 knows the alert is closed, as the prototype does). The person page highlights Alerts. |
| 4 | Search | Submit → `/alerts?q=<text>`. The Alerts page shows the "Search: … ×" note pill. |
| 5 | Icons | The prototype's SVG paths become components in `components/icons.tsx`. No icon library. |
| 6 | Styling | Tailwind utilities. Typed variant maps. A tiny `lib/cx.ts`. Plain CSS in `index.css` only for the stacked table, the `rec` blink, the dashed `flow` line and `prefers-reduced-motion`. |
| 7 | Breakpoints | `@theme`: `--breakpoint-tab: 761px` (shell, single column, stacked tables) and `--breakpoint-wide: 1101px` (4→2 tile grid, two-column → one, settings 3→1), the same as the prototype's 760/1100. |
| 8 | Tokens | All prototype colours become theme colours with the prototype's names: `red`, `red-bg`, `pur`, `pur-bg`, `amb`, `amb-bg`, `grn`, `grn-bg`, `blu`, `blu-bg`, `org`, plus `feed` `#0b1220` and the greys. The Phase 4 names `danger`/`ok` are renamed (the auth pages are updated). Light theme only. |
| 9 | Pill keys | `lib/constants.ts` maps Data-Contracts §2 values: `abandoned_bag` → red "Abandoned", `possible_theft` → purple **"Possible theft"**. Status colours follow the prototype: active red, acknowledged amber, resolved green, false_alarm grey, confirmed_theft purple, authorised_pickup blue (prototype History `oc()`). The key types are a local union marked `TODO(phase-07)` until the OpenAPI schema exposes the enums. |
| 10 | Primitives | Card (+ `CardHeader`), Button (variants default/dark/red/pur/soft, `wide`, sizes 44/52, link mode), IconButton, Pill / TypePill / StatusPill, StatTile, KeyValue (`hot`), PageHeader, BackLink, Segmented, Select, Toggle, RangeField, ProgressBar, Donut, AlertCard, FeedFrame (cam header / 16:9 body / footer chips), Snapshot, Table (+ stacked mobile), Pager, Modal (native `<dialog>`), EmptyState, DemoBadge. Each is built because a prototype section uses it. |
| 11 | Page composition | Each page is a thin file that arranges section components (`features/<area>/sections/*`). Sections are flat files in each `features/<area>/` folder (no `sections/` subfolder). Where later data needs a prop (alert cards, tables) the prop exists; otherwise the section is static until its phase. Later phases fill them in and don't touch the layout. |
| 12 | Disabled controls | Controls whose action doesn't exist yet (alert actions, settings sliders, Save) render **disabled** with a `title`/help line naming the phase. Filters and layout toggles that work locally are live. |
| 13 | Feed art | The prototype's drawn CCTV scenes are sample data and are not ported. The feed frame keeps the dark `#0b1220` 16:9 box and its overlays ("REC · CAM", time), which real frames will fill. |
| 14 | Accessibility | Skip link. `<main>` focused on route change. Per-route `<title>` (`usePageTitle`). Global `:focus-visible` ring. 44 px targets (52 px mobile tabs). Never colour alone. `prefers-reduced-motion` stops the blink and flow animations. |
| 15 | Visual check at 390 px | Playwright Chromium run ad hoc from the scratchpad (not a project dependency): screenshots of the prototype and the app at 1440×900 and 390×844 for every view, and a `scrollWidth <= innerWidth` assertion on every route. |

## Plan
1. **Fonts and tokens:** `index.html` loads IBM Plex Sans + Mono. `styles/tokens.css` gets the full palette, the theme names, breakpoints, `--font-sans`/`--font-mono`, base resets (`font: inherit`, `min-width: 0`) and tabular figures. `styles/index.css` gets the stacked table, `rec`, `flow` and reduced motion.
2. **Basics:** `lib/{cx,constants,usePageTitle}.ts`, `components/icons.tsx`.
3. **Primitives** (decision 10), one file each in `components/`.
4. **Shell:** `layout/{AppShell,Sidebar,NavList,Topbar,MobileTabBar}.tsx`.
5. **Pages and sections** per the inventory: `features/dashboard/`, `live/`, `alerts/` (list and detail), `person/`, `history/`, `settings/`. `app/router.tsx` puts `RequireAuth → AppShell` around them. Delete `app/HomePage.tsx`.
6. **Auth pages:** restore the login art panel, move to `Button` and the new type and boxes, rename the colour tokens. Behaviour must not change (the 47 tests still pass).
7. **Tests:** shell (every route renders in the shell with its h1 and title, `aria-current`, user block, log out → `/logged-out`, search → `/alerts?q=`, badge hidden at 0 and shown at 3, skip link first). One render test per page that asserts **every section heading in the inventory is present** with its empty state, so a skipped section fails CI. Primitives (pill labels for every enum, "Possible theft" and never "Theft", DemoBadge, Modal Esc and focus return, Table states and `data-label`, Pager disabled ends, Segmented keyboard use).
8. **Docs** (below), then the visual check.

## Contract / doc changes
- No change to `packages/contracts` or the API in this phase. The gaps above are recorded here and in the phases that will decide them.
- `Decisions.md`: new **D-14 "Prototype UI is preserved; only type, spacing, boxes and tables are refined"**: IBM Plex Sans + Mono replace Inter + JetBrains Mono; the palette, views and sections are fixed; empty states instead of sample numbers.
- `Frontend.md` §2 (layout, primitives, `sections/` folders), §5 (fonts, the refinement table, breakpoints, no-fake-numbers rule, accessibility additions).
- `Folder-Structure.md` line 17: drop "(tokens.css arrives in Phase 5)" and add `features/*/sections/`.
- `master-roadMap-plan.md`: under Phases 7, 8, 12 and 17, add a line "decide gaps N from phase-05" so they aren't forgotten.

## Verification
```
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
uv run pytest            # unchanged, should stay green
```
Runtime (`/verify`): log in as `operator`, then visit every sidebar link and every mobile tab, `/alerts/alr_x` (deep-link reload) and a person URL. Check keyboard-only navigation from the skip link through the shell. Take the Playwright screenshots (decision 15) and compare them with the prototype view by view, using the section inventory as the checklist. Run the no-horizontal-scroll assertion on all routes at 390 px.

## Acceptance
- [x] Every prototype view and every section in the inventory is present in the same place and order (the per-page section tests pass)
- [x] The colour palette is the prototype's: no new hex values (a grep of `src/` hex colours against the prototype list)
- [x] Type is IBM Plex Sans + Mono. Spacing, cards and tables follow the refinement table
- [x] Every route is reachable and the protected ones sit inside the shell
- [x] Keyboard focus is visible, there is a skip link, and focus moves on navigation
- [x] No horizontal scroll at 390 px. Layout checked at 1440 and 390 px against the prototype
- [x] No fake numbers anywhere, and "Possible theft" wording throughout

## What changed (filled at the end)
- **Web, design system:** `styles/{tokens,index}.css` (full prototype palette, IBM Plex, breakpoints `tab:`/`wide:`, stacked-table CSS), `index.html` fonts, `lib/{cx,constants,usePageTitle}.ts`, and `components/`: Card, Button (+LinkButton, IconButton), Pill (+TypePill, StatusPill, DemoBadge), StatTile, KeyValue, PageHeader (+BackLink), controls (Segmented, SelectField, Toggle, RangeField, SwitchRow), charts (ProgressBar, Donut), Feed (Feed, FeedCard, FeedChip, Snapshot), Table, Pager, Modal, EmptyState, Logo, icons.
- **Web, shell and pages:** `layout/{AppShell,Sidebar,Topbar,MobileTabBar,navItems,grids,initials,useShellStatus}`, `app/router.tsx` (`RequireAuth` > `AppShell` > 7 routes), `app/HomePage.tsx` deleted. Pages: dashboard (5 section files), live (3), alerts list (4) and detail (5), person (4), history (1), settings (4). Auth pages restyled; the login art panel is restored (`LoginArt`).
- **Tests:** 103 web tests (was 47): shell (24), one test per page listing every prototype section (16), primitives (22), plus the 47 auth tests. The auth tests now assert the Dashboard heading instead of the old placeholder text. `test/setup.ts` stubs `<dialog>` and `scrollTo` for jsdom.
- **Docs:** `Decisions.md` D-14, `Frontend.md` §2 and §5, `Folder-Structure.md`, and carry-over notes under roadmap Phases 7, 8, 12 and 17.
- **Decisions taken while building** (none beyond D-14 affect later phases): `Table` rows are `{id, cells: Record<column, ReactNode>}` so no hand-written API row types are needed; alert and history filters live in the URL (`type`, `status`, `q`, `range`); a track id that is not a positive whole number shows an "Unknown person" card; compact buttons are 40 px on desktop and 44 px on touch widths; the login version pill was dropped rather than invented.
- **Results:** `bun run lint`, `typecheck`, `build` clean; 103 web tests and 425 Python tests pass. The built CSS contains only prototype colours. Real-browser check (Playwright driving the installed Edge, from the scratchpad, not a project dependency): every route at 1440 and 390 px compared with the prototype by eye, no horizontal scroll anywhere, keyboard pass (skip link first, 2 px focus ring on every stop, focus on `<main>` after navigation).
- **Bugs found only in the browser and fixed:** (1) focusing `<main>` scrolled the heading under the sticky topbar, and React StrictMode made it happen on first load (now `preventScroll` plus an explicit scroll to top, with regression tests). (2) The active Pager page had white text on white, because `bg-white` and `bg-navy` competed. (3) The same competing-class pattern in `Pill` (`small` prop now). (4) The "Acknowledged" tile label was clipped at 390 px.
- **Known gaps carried forward:**
  - The seven data gaps listed above, with the phase that decides each (see the roadmap notes).
  - `Modal` is built but no page uses it yet. Esc and focus return were checked on a native `<dialog>` in Edge, not through our component; the jsdom tests only cover open/close sync and backdrop click.
  - The visual comparison was by eye, not a pixel diff. The stacked mobile table was checked with injected sample rows, since there is no real data yet. Hover states and the logged-out page were not screenshotted.
  - Real Gmail delivery (Phase 4) is still unverified.
