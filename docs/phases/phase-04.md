# Phase 04: Authentication
Branch: `feature/phase-04-auth` (from `main`, which now contains Phase 3; not pushed) · Status: done (awaiting team review/merge) · Owner: Farooq khan

## Goal
Operators log in and out; API routes are protected by role. Users who forgot their password get an email (Gmail SMTP) with a link to set a new one. Every API error uses the standard error shape. The web app gets generated types, a typed client, login, logged-out, forgot-password and reset-password pages that match the prototype, and a `RequireAuth` guard.

## Decisions taken while planning
| # | Unclear point | Decision |
|---|---|---|
| 1 | Login response shape | API-only schemas (phase-02 decision 11): `LoginRequest {username, password}` and `LoginResponse {access_token, token_type: "bearer", expires_at, user: UserMe}`. `expires_at` lets the client drop an expired token without a round trip. `user` reuses the contract `UserMe`. |
| 2 | JWT contents | HS256, claims `sub` (user ID), `iat`, `exp` (12 h). **No role in the token:** `current_user` loads the user from the DB on each request, so a role change or a deleted user takes effect at once. |
| 3 | Secret strength (approved) | Settings require `JWT_SECRET` and `WORKER_KEY` to be at least 32 characters (PyJWT warns below 32 bytes). `.env.example` leaves them empty with a generation hint, so a copied file fails with a clear message until each dev sets real values. The local `.env` is updated with generated values. |
| 4 | Wrong user vs wrong password | Same `401 UNAUTHORIZED` "Invalid username or password." for both. When the user doesn't exist, a dummy argon2 check still runs, so response time doesn't reveal which usernames exist. Usernames are matched case-insensitively (stored lowercase). |
| 5 | Error shape coverage | Handlers map: HTTP errors → codes (401 `UNAUTHORIZED` + `WWW-Authenticate: Bearer`, 403 `FORBIDDEN`, 404 and 405 → `NOT_FOUND`, incl. unknown routes); `RequestValidationError` → 422 `VALIDATION_ERROR` with one short message per field and **no input echoed**; any other exception → 500 `INTERNAL_ERROR` (traceback logged only). An `ApiError(code, status, message)` class in `core/errors.py` is raised by services. |
| 6 | Logout | Client-side only (Backend §3): drop the token, clear the query cache, go to `/logged-out`. No server revocation, so a stolen token stays valid until it expires (12 h), except after a password reset (decision 18). Accepted for FYP-1, listed under gaps. |
| 7 | `require_admin` with no admin route yet | Dependency is built and tested through a router mounted only in the test app. Real admin routes arrive in their phases. |
| 8 | Token storage | The prototype's "Remember this terminal session" checkbox decides: checked → `localStorage`, unchecked → `sessionStorage`. Always kept in memory too. On load, a stored token is checked with `GET /api/auth/me`; if rejected, it's dropped. |
| 9 | Prototype login fields | The prototype asks for an email; our users log in with a username, so the field is **"Username"** with the same layout. "Forgot password?" is a real link to `/forgot-password` (decisions 14-20). The prototype's made-up hero figures (e.g. "99.98% up") are left out (D-06 spirit: show nothing fake as real). |
| 10 | Styling before Phase 5 | Phase 5 ports the full design system. Phase 4 adds only `styles/tokens.css` (the prototype `:root` tokens and fonts, Phase 5 task 1 pulled forward) so the auth pages match. The "shell" is a placeholder (user name, role, Log out); `AppShell` is Phase 5. |
| 11 | Typed client | Add `openapi-fetch` (same author as `openapi-typescript`, ~6 kB) behind `lib/api/client.ts`. Its middleware adds `Authorization: Bearer` and, on any 401, clears the token and redirects to `/login?next=<path>`. Components never call `fetch`. |
| 12 | `gen:api` without a running server | `apps/api/scripts/export_openapi.py` writes the schema from `create_app().openapi()`; `bun run gen:api` runs it, then `openapi-typescript` → `src/lib/api/schema.d.ts`. Both files are committed so the web builds without Python. An API test fails if the committed `openapi.json` is stale. |
| 13 | Login brute force | Out of scope (campus LAN, dev users). Listed under gaps. |
| 14 | Forgot-password flow (approved) | `POST /api/auth/forgot-password {email}` always answers `202` with the same neutral message, whether or not the email exists (no account enumeration). `POST /api/auth/reset-password {token, new_password}` sets the password. API-only schemas, so no contract change. |
| 15 | Users need an email | New nullable, unique, lowercase `users.email` (migration 0002). A user without one cannot reset by email; an admin sets it with `scripts/set_user_email.py <username> <email>` (a user-management UI is out of scope). The seed gives its two users placeholder `@nigehban.local` addresses, **never a real person's address**, and does not change existing rows. |
| 16 | Reset token | `secrets.token_urlsafe(32)`, valid 30 minutes, single use. Only its SHA-256 hash is stored, as the primary key of a new table `password_reset_tokens(token_hash, user_id fk, expires_at, used_at, created_at)` (no new ID prefix, so no contract change). A new request voids the user's older unused links. At most one email per user per 60 s (extra requests still get the neutral 202). A bad, used or expired link returns `422 VALIDATION_ERROR` "This reset link is invalid or has expired." |
| 17 | New password rules | 8-128 characters, and not equal to the username. No other composition rules. |
| 18 | Old sessions after a reset | New nullable `users.password_changed_at`. `get_current_user` rejects any token issued before it, so a reset signs out every device. |
| 19 | Sending mail | `app/services/mailer.py` with `MAIL_BACKEND=console\|smtp`. `smtp` uses `smtplib` with STARTTLS; for Gmail: `smtp.gmail.com:587`, `SMTP_USER`, and a Google **App Password** in `SMTP_PASSWORD` (needs 2-step verification; the normal Gmail password does not work). `console` (default) logs the reset link instead of sending, for dev and tests. Mail is sent in a background task, so the response time doesn't reveal whether the email exists; send failures are logged, never shown to the caller. The link is `WEB_BASE_URL/reset-password?token=...` (default `http://localhost:5173`). Credentials live only in `.env`. |
| 20 | Web pages | `/forgot-password` (email field, shows the neutral message) and `/reset-password?token=` (new password + confirm, then a link to log in). The token is removed from the address bar after load (`history.replaceState`) and never stored. |
| 21 | Logout navigation (found while testing) | A Log out button that cleared the session and navigated in the same event made `RequireAuth` redirect to `/login` before the navigation landed, so users never saw `/logged-out`. Now **opening `/logged-out` ends the session**, and a Log out button only navigates there. Documented in Frontend.md §3. |

## Plan
**API (apps/api)**
1. `core/settings.py`: secrets min 32 chars; `jwt_expiry_hours = 12`; `mail_backend`, `smtp_host/port/user/password/from`, `web_base_url`. Update `.env.example` and the local `.env`.
2. `core/security.py`: `create_access_token(user_id)`, `decode_access_token(token)`, `DUMMY_HASH` for the timing-safe miss.
3. `core/errors.py`: `ApiError` + `register_error_handlers(app)` (decision 5), using `ErrorBody`/`ErrorCode` from contracts.
4. `schemas/auth.py`: `LoginRequest`, `LoginResponse`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `MessageResponse` (all `extra="forbid"`).
5. `services/auth_service.py`: `authenticate`, `to_user_me`.
6. `routers/deps.py`: `get_current_user` (Bearer → token → user; 401 if missing, invalid, unknown user or issued before `password_changed_at`), `require_admin` (403).
7. `services/mailer.py` (console + smtp) and `services/password_reset_service.py` (request link, reset password).
8. Migration `0002`: `users.email`, `users.password_changed_at`, check `username = lower(username)`, table `password_reset_tokens`. Models, seed placeholder emails, `scripts/set_user_email.py`.
9. `routers/auth.py`: `login`, `me`, `forgot-password`, `reset-password`; wire into `main.py` with the error handlers.
10. `scripts/export_openapi.py`.
11. Tests: `test_auth.py` (login ok; wrong password and unknown user give the same 401 body; missing, garbage, expired and tampered tokens 401; deleted user 401; `/me`), `test_errors.py` (422 without echo, unknown route 404 shape, 500 shape without traceback, admin route 403 for operator / 200 for admin), `test_password_reset.py` (same neutral 202 for known and unknown email; mail sent only for a known email; link works once; expired, used and garbage token 422; older links voided; 60 s throttle; weak password 422; old JWT rejected after a reset; login works with the new password and not the old; the SMTP mailer builds a correct message, tested with a fake SMTP class), `test_openapi_fresh.py`.

**Web (apps/web)**
12. `bun add openapi-fetch`; `gen:api` script; generate `schema.d.ts`.
13. `lib/api/client.ts` (openapi-fetch + auth/401 middleware), `lib/api/token.ts` (memory + local/session storage).
14. `features/auth/`: `AuthProvider` + `useAuth`, `RequireAuth` (redirect to `/login?next=`), `RequireAdmin`, `LoginPage`, `LoggedOutPage` (session end time), `ForgotPasswordPage`, `ResetPasswordPage`.
15. `app/router.tsx`, `app/providers.tsx`, placeholder `HomePage` inside `RequireAuth`, `styles/tokens.css`.
16. Tests: RequireAuth redirect, login success, login 401 message, logout → `/logged-out` with the token gone, any 401 → `/login`, "remember" picks local vs session storage, forgot-password shows the neutral message, reset page submits the token and shows success or the invalid-link error.

## Contract / doc changes
- No change to `packages/contracts` (UserMe and ErrorBody already exist).
- `Backend.md` §3 (login response, 401 body, forgot/reset routes), §4 (`users.email`, `password_changed_at`, `password_reset_tokens`), §5 (error mapping, timing-safe login, reset rules), §6 (secret length, mail settings, `gen:api`).
- `Frontend.md` §2 (`token.ts`, `openapi-fetch`, `RequireAdmin`, reset pages), §3 (`/login?next=`, `/forgot-password`, `/reset-password`), §4 (token storage).
- `Folder-Structure.md` (`scripts/{export_openapi,set_user_email}.py`, `src/lib/api/openapi.json`).
- `.env.example` (empty secrets with hint, mail settings), README (secret rule, Gmail App Password setup, `gen:api`).

## Verification
```
uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && bun run gen:api && git diff --exit-code src/lib/api   # types up to date
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
```
Runtime (`/verify`): curl login with right and wrong password (200 / 401 shape), `/api/auth/me` with no, garbage and valid tokens, a 422 that doesn't echo the password, forgot-password for a known and an unknown email (identical responses; console log shows a link only for the known one), reset with that link once, a second use fails, the old token stops working. SMTP: run a local fake SMTP server and send one message through the `smtp` backend. Browser (`bun dev` + uvicorn): `/` redirects to `/login` → log in as `operator` → placeholder home → reload keeps the session → Log out → `/logged-out` → Forgot password → reset page.

## Acceptance
- [x] Login/logout works end to end (API by curl; pages and flows by 47 component tests; the four pages rendered in a real browser engine). A click-through in a live browser was **not** done by me.
- [x] Generated types are used by the client (`schema.d.ts` from the API's OpenAPI; no hand-written API types).
- [x] 401 for wrong password and missing token; 403 for an operator on an admin route.
- [x] Every API error, including 404/405/422/500, uses `{ "error": {code, message} }`.
- [x] Forgot password: a known and an unknown email get the same response; the link sets a new password once; old sessions stop working.
- [ ] A real Gmail send is **not** verified (needs the user's App Password). The SMTP path was run against a local fake SMTP server: AUTH, sender, recipient, subject and body all correct.

## What changed (filled at the end)
- **API added:** `core/{errors,security,settings}.py` (rewritten), `schemas/auth.py`, `services/{auth_service,mailer,password_reset_service}.py`, `routers/{auth,deps}.py`, `models/password_reset_token.py` and `user.py` (email, `password_changed_at`, lowercase checks), migration `0002`, `scripts/{set_user_email,export_openapi}.py`, seed placeholder emails, `.env.example`.
- **Web added:** `lib/api/{client,token}.ts` + generated `openapi.json`/`schema.d.ts` (`bun run gen:api`), `features/auth/*` (login, logged-out, forgot, reset, `AuthProvider`/`useAuth`, `RequireAuth`, `RequireAdmin`, `PasswordField`, `AuthShell`), `app/{router,providers,HomePage}.tsx`, `styles/tokens.css`, `openapi-fetch` dependency, test helpers.
- **Docs:** `Backend.md` §3-§6, `Frontend.md` §2-§4, `Folder-Structure.md`, `README.md`, `.env.example`.
- **Results:** 413 Python tests (144 in `apps/api`), 47 web tests, ruff, eslint, `tsc` and `vite build` clean. `alembic upgrade/downgrade/upgrade` and `alembic check` clean for 0002.
- **Runtime verification (dev DB :5433):** login, `/me` with no, garbage and valid tokens, wrong password vs unknown user (identical body), 422 without echoing the password, 404 and 405 shapes, neutral 202 for known and unknown email with a console-mail link only for the known one, a 422 for a weak password that keeps the link alive, one successful reset, link reuse 422, old session 401 after reset, old password 401 and new 200, the 60 s throttle, only hashes stored. SMTP against a fake server. Vite proxy `/api`, deep-link fallback, four pages screenshotted. The dev `operator` password was changed by this and restored to `operator123`.
- **Fixes found while building:** (1) the test setup defaulted `DATABASE_URL` to port 5432, which is the other project's database; one failed login attempt was made against it (no change), and the default was removed so tests can only use `.env`. (2) Logout never reached `/logged-out` (decision 21). (3) Testing Library cleanup wasn't registered (vitest globals are off). (4) `PasswordField` was declared inside `LoginPage`, which would reset the show/hide state on each render; moved to its own file. (5) FastAPI documented 422 as `HTTPValidationError`; the real error body is now declared so generated types are right.
- **Decisions taken:** the 21 above. None change `Decisions.md`.
- **Known gaps carried forward:**
  - No server-side token revocation or logout: a copied token stays valid for 12 h (except after a password reset).
  - No brute-force limit on `/login`, and the reset throttle is per user only, not per IP.
  - The sub-second window: a token issued in the same second as a reset, before it, stays valid (token timestamps are whole seconds).
  - No admin UI to set a user's email; use `scripts/set_user_email.py`. Users without an email cannot reset by email.
  - Real Gmail delivery and a mobile-width (390 px) visual check are still to do (Phase 5 covers the visual check; headless Edge here cannot go below about 500 px).
  - The seed's two users get `@nigehban.local` placeholder emails that cannot receive mail.
