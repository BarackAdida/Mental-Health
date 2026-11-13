# Security Audit (Week 9)

Scope: the Mental Health App server in `WebDevApp/Server`, with most attention on the partner-facing Events API (`/api/events`). Date: 2026-10-26. The server runs on Render (shared database) at `https://mental-health-l6ub.onrender.com`.

## 1. What we added

| Control | What it does |
|---|---|
| API key authentication | `middleware/apiKeyAuth.js` checks the `X-API-Key` header against `API_KEYS` (one `name:key` pair per consumer, set in the environment, never in code). Keys are compared in constant time. No key or a wrong key gets `401 {"message":"Missing or invalid API key"}` before any route runs. |
| Rate limiting | `middleware/rateLimit.js` counts requests per key in a 60 second window. The 101st request in a window gets `429` with a `Retry-After` header and `{"message":"Too many requests","retryAfter":N}`. |
| Where it applies | `app.js` registers both on `/api/events`, before the events routes. |
| Safe error responses | A final error handler in `app.js` returns a short JSON message instead of Express's default error page, which includes a stack trace and file paths outside production. |
| Separate keys | Each consumer has its own key: one for our partner team (Group 10) and one for our own testing. They are set as `API_KEYS=name:key,name:key` in `.env` locally and in Render's environment settings. |

### Which routes need a key, and why

| Route group | Protection | Reason |
|---|---|---|
| `GET /api/events`, `GET /api/events/:id` | API key | These are the endpoints our partner consumes. |
| `/api/events/saved`, `/api/events/:id/save` | Login session (already required) | Used by our own website, which cannot keep a key secret in browser code. |
| `POST/PATCH/PUT/DELETE /api/events` | Admin login session (already required) | Admin only. A logged-in admin also skips the key check so the admin page keeps working. |
| `/api/auth/*`, `/api/doctors/*`, `/api/appointments/*` | Login session / admin session | Website-only routes, not part of the partner contract. Login and signup have to stay open because they are how a session starts. |
| `GET /api/partner/counseling` | Open | See open finding C. |
| `/` (Swagger docs page) | Open | Documentation only, no data. It is the equivalent of the public health-check the lab allows. |

A normal signed-up user does **not** skip the key check on the public event list, because anyone can sign up. Only admins and the session-only routes skip it.

## 2. Audit checklist: what we looked at and what we found

| # | Check | What we looked at | Finding | Action |
|---|---|---|---|---|
| 1 | Sensitive fields in responses | `serialize()` in `routes/events.js`; login, signup, `/auth/me` and admin-user responses in `routes/auth.js`; `mapDoctor()` in `routes/doctors.js`; `mapAppointment()` in `routes/appointments.js` | Events are built from an explicit field list, not raw rows. `password_hash` is read at login but never returned (login and signup return only id, name, email, is_admin). `/auth/me` returns only the caller's own record and `/auth/admin/users` is admin only. **Doctors:** each record includes `licenseNumber`, `phoneNumber` and `email`, and any logged-in user (not only admins) can read them. | Events, auth, appointments: nothing wrong. Doctors: not changed this week (the doctors page uses these fields); open finding A. |
| 2 | Other people's data via ID changes | `/events/saved` and the save/unsave routes; `/events/:id`; `/auth/me`; the appointments list and cancel route | Saved events are selected with `WHERE us.user_id = $1` using `req.session.userId`. Appointments are listed with `WHERE a.user_id = $1` and cancelled with `WHERE id = $1 AND user_id = $2`, so changing an ID in the URL cannot show or cancel someone else's booking. `/auth/me` reads the id from the session, not the URL. Event ids are public data by design. | Nothing wrong. |
| 3 | Error messages | Every `catch` block and the 4xx/5xx bodies in `events.js`, `auth.js`, `doctors.js`, `appointments.js` | Handlers log the real error to the server console and send a generic message such as `Failed to fetch events`. No SQL, table names or paths are sent. **But:** a malformed JSON body (for example `{bad`) never reaches a handler, so Express's default error page would send a stack trace with file paths while `NODE_ENV` is not `production`. | **Fixed.** Added a final error handler in `app.js` that returns `{"message":"Invalid request"}` (4xx) or `{"message":"Internal server error"}` and logs only the message. |
| 4 | Write endpoints and extra fields | `POST`/`PATCH` in `events.js`; signup in `auth.js`; `POST`/`PUT` in `doctors.js`; `POST` in `appointments.js` | Events insert and update only named fields (`title`, `description`, `location`, `startTime`, `cancelled`); an extra `id` or `isAdmin` in the body is ignored. Signup hard-codes `is_admin = false`, so a caller cannot make themselves admin. Doctors and appointments use named columns only, and appointments take the user id from the session, not the body. **Doctors:** create, update and delete only require a login, not an admin. | Events, signup, appointments: nothing wrong. Doctors: open finding B. |
| 5 | Keys in the wrong place | `.gitignore` files, `.env.example`, README, source files, startup log, full git history | Both `.env` files (`WebDevApp/Server/.env` and `WebDevApp/mental-health/.env`) are covered by `.gitignore` (checked with `git check-ignore -v`). `.env.example` and the README only contain placeholders. The startup log prints how many keys were loaded, never the keys. The partner key variable (`PARTNER_API_KEY`) is read from the environment and never logged. **Git history:** a file named `.env` was committed in early commits (b42d42b, 471f091) and later removed; it is not tracked now (`git ls-files .env` prints nothing). It held local development values only (a simple `SESSION_SECRET`, a `JWT_SECRET` that the code does not use, and a localhost database password), not the Week 9 API keys. We left those values unchanged because the lab only requires replacing a leaked API key. When we first searched the git history for each real API key value we found none. **That was later found to be wrong:** see finding E and the update in section 6. | See finding E. Recommended later: replace `SESSION_SECRET` and the database password with long random values (open finding D). |
| 6 | Open routes | Full route list in `app.js` | `GET /api/partner/counseling` has no key and no login. It returns only data that StrathShop already publishes, but anyone can use our server to call StrathShop repeatedly. | Accepted for now because the website needs it without a login; open finding C. |

## 3. Open findings (found, not fixed this week)

- **A. Doctor contact details are visible to every logged-in user.** *(Partly fixed, see section 6: `licenseNumber` is now admin-only; phone and email are still visible.)* Fix: return only name and specialization to non-admins, or require admin for the full record.
- **B. Any logged-in user can create, edit or delete doctors.** *(Resolved, see section 6: those routes no longer exist.)* Original fix idea: add an admin check on `POST`, `PUT` and `DELETE` in `routes/doctors.js`, the same way `routes/events.js` does with `requireAdmin`.
- **C. `/api/partner/counseling` is unauthenticated and uncached.** *(Still open. A circuit breaker now stops calls to StrathShop while it is failing, but the route is still open and calls the partner on every request when it is healthy.)* Fix: cache the partner response for a short time and rate limit it by IP once we know the proxy setup.
- **D. Old development secrets are in git history.** The early `.env` held a weak `SESSION_SECRET` and a localhost database password. Fix: replace both with long random values wherever they are still in use.

- **E. The class API key was committed.** *(Found later; see section 6.)* The same key appeared in a tracked file, `WebDevApp/Server/.env.render-backup`, and was hard-coded in `__tests__/events.test.js` and `tests/api.test.js`. This contradicts the history search described under check 5. The test files have been fixed. The backup file is still tracked and the key has not been rotated, because the instructor allows the class keys for now.

## 4. Rate limit threshold and why

**100 requests per minute per key.** A partner page that lists events makes one or two calls per page load, so even a busy page stays well under this. A buggy loop (several calls a second) reaches the limit in a few seconds and gets a `429`, which protects the shared database. The handout's default of 100 per minute gave room for normal use without being so high that it stops protecting us. Limits are counted per key, so one consumer going over does not block the other.

Limits of this design: the counter lives in server memory, so it resets when the server restarts and would not work across several server copies. Production systems use a shared store such as Redis.

## 5. Evidence

**Automated tests** (`__tests__/security.test.js`, no database needed). Run with `npm test -- security`: **9 passed, 9 total.**

- no key gets 401
- a wrong key gets 401 and is not echoed back
- a valid key gets 200
- each consumer has its own key and is told apart
- a key that is only a prefix of a real key is rejected
- the docs route outside `/api` stays open
- with no keys configured the check is off and a warning is logged
- requests over a limit of 3 return `200 200 200 429 429`, with a `Retry-After` header and a JSON body
- one consumer hitting the limit does not block another

The older events tests (`__tests__/events.test.js`, `tests/api.test.js`) were updated to send a test key on their public calls, so they still check the same behaviour.

**Live server (Render), 2026-10-26:**

```
curl.exe -i https://mental-health-l6ub.onrender.com/api/events
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
{"message":"Missing or invalid API key"}
```

With a valid key (sent in the `X-API-Key` header), the same request returns `200` and the events list as JSON (retested at 11:35 GMT the same day):

```
curl.exe -i -H "X-API-Key: <your-api-key>" https://mental-health-l6ub.onrender.com/api/events
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
[{"id":"evt_1","title":"Wellness event", ... }, ...]
```

The key shown in the command is a placeholder; the real key is not stored in this repo.

## 6. Update, 13 November 2026

What changed since this audit was written, checked against the code:

- **v2 routes:** the same protection applies to the current event paths, `/api/v2/events` and `/api/v2/events/:id` (API key on reads, admin session on writes). The old `/api/events` paths still work until 20 November and are protected in the same way.
- **Finding B resolved:** `routes/doctors.js` has no create, update or delete routes any more. Doctors are synced from the StrathShop counseling listings. Doctors can only change their own availability, and any logged-in user can add a review.
- **Finding A partly fixed:** `licenseNumber` is returned to admins only. Phone number and email are still returned to every logged-in user.
- **Finding C still open,** with one change: a circuit breaker (`circuitBreaker.js`) stops calling StrathShop for 30 seconds after 3 failed requests in a row.
- **Finding E:** hard-coded keys removed from the two test files. The tests now set their own dummy key and session secret, so they need no real key. `.env.render-backup` is **still tracked** and the class key has **not been rotated**; this is a known limit, accepted for the course. After the course the key and the secrets in that file should be rotated and the file removed from git (`git rm --cached`).
- **Tests:** 7 suites, 28 tests, all passing with mocked database and dummy keys. They have not been run against the live server.
