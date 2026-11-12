# Security Audit (Week 9)

Scope: the Mental Health App server in `WebDevApp/Server`, with most attention on the partner-facing Events API (`/api/events`). Updated: 2026-11-12. The server runs on Render (shared database) at `https://mental-health-l6ub.onrender.com`.

## 1. What we added

| Control | What it does |
|---|---|
| API key authentication | `middleware/apiKeyAuth.js` checks the `X-API-Key` header against `API_KEYS` (one `name:key` pair per consumer, set in the environment, never in code). Keys are compared in constant time. No key or a wrong key gets `401 {"message":"Missing or invalid API key"}` before any route runs. |
| Rate limiting | `middleware/rateLimit.js` counts requests per key in a 60 second window. The 101st request in a window gets `429` with a `Retry-After` header and `{"message":"Too many requests","retryAfter":N}`. |
| Where it applies | `app.js` registers key authentication and the per-key limiter on partner-facing Events routes. The public partner-counseling proxy is limited by client IP and caches successful data briefly. |
| Missing configuration | If `API_KEYS` is absent or empty, protected Events routes now fail closed with `503`; they do not silently become public. |
| Safe error responses | A final error handler in `app.js` returns a short JSON message instead of Express's default error page, which includes a stack trace and file paths outside production. |
| Separate keys | Each consumer has its own key: one for our partner team (Group 10) and one for our own testing. They are set as `API_KEYS=name:key,name:key` in `.env` locally and in Render's environment settings. |

### Which routes need a key, and why

| Route group | Protection | Reason |
|---|---|---|
| `GET /api/events`, `GET /api/events/:id` | API key | These are the endpoints our partner consumes. |
| `/api/events/saved`, `/api/events/:id/save` | Login session (already required) | Used by our own website, which cannot keep a key secret in browser code. |
| `POST/PATCH/PUT/DELETE /api/events` | Admin login session (already required) | Admin only. A logged-in admin also skips the key check so the admin page keeps working. |
| `/api/auth/*`, `/api/doctors/*`, `/api/appointments/*` | Login session / admin session | Website-only routes, not part of the partner contract. Login and signup have to stay open because they are how a session starts. |
| `GET /api/partner/counseling` | Open, IP-limited and cached | The website displays the data without an API key; this proxy is limited to 30 requests per minute per IP and caches successful data for 60 seconds. |
| `/` (Swagger docs page) | Open | Documentation only, no data. It is the equivalent of the public health-check the lab allows. |

A normal signed-up user does **not** skip the key check on the public event list, because anyone can sign up. Only admins and the session-only routes skip it.

## 2. Audit checklist: what we looked at and what we found

| # | Check | What we looked at | Finding | Action |
|---|---|---|---|---|
| 1 | Sensitive fields in responses | `serialize()` in `routes/events.js`; login, signup, `/auth/me` and admin-user responses in `routes/auth.js`; `mapDoctor()` in `routes/doctors.js`; `mapAppointment()` in `routes/appointments.js` | Events use an explicit response field list. Password hashes are not returned. Doctor directory responses now omit license number, phone number, and email for non-admin users; admins and the doctor's own profile can receive them. | Restricted doctor contact and license fields to authorized views. |
| 2 | Other people's data via ID changes | `/events/saved` and the save/unsave routes; `/events/:id`; `/auth/me`; the appointments list and cancel route | Saved events are selected with `WHERE us.user_id = $1` using `req.session.userId`. Appointments are listed with `WHERE a.user_id = $1` and cancelled with `WHERE id = $1 AND user_id = $2`, so changing an ID in the URL cannot show or cancel someone else's booking. `/auth/me` reads the id from the session, not the URL. Event ids are public data by design. | Nothing wrong. |
| 3 | Error messages | Every `catch` block and the 4xx/5xx bodies in `events.js`, `auth.js`, `doctors.js`, `appointments.js` | Handlers log the real error to the server console and send a generic message such as `Failed to fetch events`. No SQL, table names or paths are sent. **But:** a malformed JSON body (for example `{bad`) never reaches a handler, so Express's default error page would send a stack trace with file paths while `NODE_ENV` is not `production`. | **Fixed.** Added a final error handler in `app.js` that returns `{"message":"Invalid request"}` (4xx) or `{"message":"Internal server error"}` and logs only the message. |
| 4 | Write endpoints and extra fields | Event writes, signup, doctor routes, and appointment routes | Events insert/update only named fields; signup hard-codes `is_admin = false`; appointments take the user id from the session. Current doctor routes use doctor login for availability changes; older audit notes about doctor CRUD routes do not match the current route file. | Re-check authorization if doctor write endpoints are added. |
| 5 | Keys in the wrong place | `.gitignore`, `.env.example`, README, source files, startup logs, and tracked configuration files | A tracked `WebDevApp/Server/.env.render-backup` contained populated `API_KEYS` and database-related values. It has been removed from the current tracked tree and added to `.gitignore`; its historical Git versions remain. The tests now use clearly fake, non-secret values. | Rotate the affected API keys and any real database credential in the deployment. This workspace cannot rotate hosted credentials or erase remote Git history. |
| 6 | Open routes | Full route list in `app.js` | `GET /api/partner/counseling` remains available to the website without a key, but it is now limited by client IP and successful partner responses are cached for 60 seconds. | Reduced the exposure; revisit if the route becomes externally consumed. |

## 3. Open findings (found, not fixed this week)

- **A. Doctor contact and license fields are now restricted.** Directory responses omit them for regular users; the doctor's own profile and admin views retain them.
- **B. Historical note about doctor CRUD permissions is stale.** The current doctor route file has no create/update/delete doctor endpoints; re-audit if those routes return.
- **C. Partner counseling proxy exposure is reduced, not eliminated.** It remains unauthenticated for the website, but now has an IP-based request limit and a 60-second cache.
- **D. Credentials were committed in configuration history.** A tracked backup was removed from the current tree, but repository history and deployment settings may still contain credentials. Rotate the affected API keys and any real database credentials; do not assume deleting the file revokes them.

## 4. Rate limit threshold and why

**100 requests per minute per key.** A partner page that lists events makes one or two calls per page load, so even a busy page stays well under this. A buggy loop (several calls a second) reaches the limit in a few seconds and gets a `429`, which protects the shared database. The handout's default of 100 per minute gave room for normal use without being so high that it stops protecting us. Limits are counted per key, so one consumer going over does not block the other.

Limits of this design: the counter lives in server memory, so it resets when the server restarts and would not work across several server copies. Production systems use a shared store such as Redis.

## 5. Evidence

**Automated tests** (`__tests__/security.test.js`, no database needed). Run with `npm test -- __tests__/security.test.js`: **10 tests** cover authentication, fail-closed configuration, key-based limits, and IP-based limits.

- no key gets 401
- a wrong key gets 401 and is not echoed back
- a valid key gets 200
- each consumer has its own key and is told apart
- a key that is only a prefix of a real key is rejected
- the docs route outside `/api` stays open
- with no keys configured the request is rejected with 503 and a warning is logged
- the public partner proxy can be rate-limited by client IP without an API key
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
