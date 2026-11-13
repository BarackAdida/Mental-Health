# Integration Log

- **Our app:** Strathmore Mental Health App (Group 9)
- **Upstream partner:** StrathShop (Group 8)
- **Partner base URL:** `https://strathshop.onrender.com/api` (hosted on Render, so it does not depend on a partner's laptop)
- **Partner contract:** `openapi.yaml` v4.0.0 and their README
- **Auth:** their README says none in this version, so no key or header is needed.
- **Our feature:** a "Campus Support" page listing StrathShop's bookable counseling services.

Never paste an API key into this file.

---

## 1. Preflight (Part A)

| Check | Result |
|---|---|
| Partner base URL, and their server is running | `https://strathshop.onrender.com/api`. Hosted on Render, so it stays up without a laptop. It sleeps when idle and the first request can take about a minute. Answered on 2026-10-19. |
| Key issued to us | None. The partner's contract and README say authentication is not part of this version, and our calls succeeded without a key. |
| Their contract and README open | Yes: `openapi.yaml` v4.0.0 and their README. The contract was our source of truth for paths, field names and status codes. |
| Live channel with partner | WhatsApp. Our teammate Collins handled the messages with Team 8. On Monday 2026-10-19 at 1:48 PM he asked for their README, `openapi.yaml` and a URL to reach their API; their live API address and GitHub repo link came back at 1:57 PM. Their repo lists James Kimani as API Lead (repo owner), and Collins was talking to James directly. |
| Check-in slot | 12:30 |

---

## 2. First call, made from a terminal (Part B)

- **When:** 2026-10-19, about 11:04 UTC (14:04 Nairobi), PowerShell on our own laptop
- **Command:**
  ```
  curl.exe -i --max-time 120 "https://strathshop.onrender.com/api/listings?category=wellness"
  ```
- **Contract says:** `200`, a JSON array of wellness listings, each with `id`, `title`, `price` (a number), `description` (may be null), `category` (lowercase `wellness`), `condition`, `status`, `imageUrl`, `sellerName`, `sellerCampus`, `datePosted` (UTC).
- **What came back:** `200 OK`, `Content-Type: application/json`, an array of 4 listings (ids 13 to 16). Every field in the contract was present on every listing. `price` was a real number (`250`, not `"250"`), `category` was lowercase, `datePosted` ended in `Z`.
- **Result:** worked first time, no key needed.
- **How long the first request took (their server sleeps when idle):** less than a second. The partner's README warns the first request can take about a minute after a quiet spell; ours did not, so their server was awake.
- **Other notes:** the response carried `access-control-allow-origin: *`, so a browser could call the partner directly. We still call it from our own server, as the handout requires, so that a key (if one is ever added) never sits in our page's JavaScript.

---

## 3. Deliberate checks

All run from the terminal on 2026-10-19 against the live partner.

| Test | Command | Contract says | What I got | Matches? |
|---|---|---|---|---|
| Counseling list | `GET /listings?category=counseling` | 200, extra `providerName`, `condition` is `N/A` | 200, four listings (ids 17 to 20), each with `providerName`, `condition` `N/A`, and `sellerName` equal to `providerName` | Yes |
| One listing | `GET /listings/13` | 200, single object | 200, single object (Ibuprofen) | Yes |
| Missing listing | `GET /listings/9999` | 404 `{"error": ...}` | 404 `{"error":"Listing not found"}` | Yes |
| Non-integer id | `GET /listings/abc` | 404 (not 400) | 404 `{"error":"Listing not found"}` | Yes |
| Bad category | `GET /listings?category=pizza` | 400 `{"error": ...}` | 400 `{"error":"category must be one of: wellness, counseling (case-insensitive)"}` | Yes |
| Capitalised category | `GET /listings?category=Wellness` | same result as lowercase | 200, the same four wellness listings | Yes |
| Categories | `GET /categories` | array of `{id, label}`, lowercase | 200, 8 categories, all lowercase | Yes |

We did not call the one write endpoint (`PATCH /listings/{id}/availability`) because it changes the partner's live data.

---

## 4. The feature we built (Part C)

**What it does:** the page `/campus-support` shows StrathShop's counseling services (title, provider, price in KES, available or booked, short description), with a "Try again" button if the data is unavailable.

**How it is built:**
- Our server route `GET /api/partner/counseling` (`WebDevApp/Server/routes/partner.js`, mounted in `app.js`) calls `PARTNER_URL + /listings?category=counseling` from the server. The browser only ever talks to our own server, so the partner URL and any future key are never in page JavaScript.
- `PARTNER_URL` (and the optional `PARTNER_API_KEY` and `PARTNER_API_KEY_HEADER`) come from `.env`. Placeholders are in `.env.example`. `.env` is not committed (checked with `git check-ignore -v .env`, and `git ls-files .env` prints nothing).
- The route returns only `id`, `title`, `description`, `price`, `status` and `providerName`, spelled exactly as in the partner's contract.
- A shape check logs a line if a counseling listing arrives without `providerName`, so a renamed field would be noticed instead of silently producing a blank.
- The page capitalises `available` and `booked` for display, because the contract says capitalising is the consumer's job.
- Per the lab rules there are no timeouts or retries yet.

**Evidence it works:**
- Calling our own route from the terminal (`curl.exe http://localhost:3000/api/partner/counseling`) on 2026-10-19 returned StrathShop's four counseling services (ids 17 to 20), each with exactly the six fields above.
- Opening `/campus-support` in the browser showed four cards (1-on-1 Counseling Session, Exam Stress & Anxiety Workshop, General Health Check-Up, Nutrition Consultation), each with provider, price in KES and an Available badge. Seen on Monday 2026-10-19, in the afternoon.
- 8 automated tests for the route (`WebDevApp/Server/__tests__/strathshop-route.test.js`) use a local stand-in for the partner. They check the request path, the fields returned, that a key is sent only when configured and never logged, and a friendly `502` for a partner error, a wrong shape, a refused connection and a wrong hostname. Run on our machine (`npx jest __tests__/strathshop-route.test.js` in `WebDevApp/Server`): 1 test suite passed, 8 of 8 tests passed.

---

## 5. Handling a failure gracefully (Part D)

How it behaves by design: if the partner cannot be reached or answers badly, our route returns `502 {"message": "Partner data unavailable"}` and logs why, the page shows "Campus support services are unavailable right now. Please try again in a few minutes.", and the rest of our server keeps running.

**Evidence from a stand-in run (not our live system).** Before running the scenarios on our own machine, the same route file was run in a scratch Express app next to a stand-in `/api/events` route, with `PARTNER_URL` pointed at each bad address. This shows what the code is expected to do; it is not our observation of the real app.

| Scenario | `PARTNER_URL` | Server log line | Response from `/api/partner/counseling` | Our other route (`/api/events`) |
|---|---|---|---|---|
| Nothing listening | `http://localhost:5999/api` | `partner call failed: ECONNREFUSED` | `502 {"message":"Partner data unavailable"}` | `200`, still answering |
| Wrong hostname | `https://no-such-host.invalid/api` | `partner call failed: ENOTFOUND` | `502 {"message":"Partner data unavailable"}` | `200`, still answering |

**Our own run on the real system** (the `.env` value was changed and the server restarted for each row, then restored). This is what we actually saw:

| Scenario | What the page showed | What our server terminal logged | `/api/events` still worked? | Recovered with no code change? |
|---|---|---|---|---|
| Nothing listening (`http://localhost:5999/api`) | The red "unavailable" message with a Try again button; no blank page and no crash | `partner call failed: ECONNREFUSED` (printed twice: React's dev mode loads the page's data twice) | Our server stayed up: the terminal showed the failure lines with no crash. `/api/events` answered correctly in our check afterwards (after the partner URL was restored); it was not tested while the partner was unreachable. | Yes: after restoring `PARTNER_URL` and restarting, `/api/partner/counseling` returned the four services again with no code change |
| Wrong hostname (`https://no-such-host.invalid/api`) | Not run on our system (optional: the handout asks for one failure case) | Not run | Not run | Not run |

After the scenario `PARTNER_URL` was set back to `https://strathshop.onrender.com/api` and the server restarted. `curl.exe http://localhost:3000/api/partner/counseling` then returned StrathShop's four counseling services (ids 17 to 20) again.

---

## 6. Bugs and surprises

No bug was found in the partner's API: every check in section 3 matched the contract. The rows below are everything that broke or surprised us this week, whoever's code it was.

| # | What broke (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 1 | The handout expects a private API key from the partner, but their README and contract say "Authentication: None in this version", and our first call worked with no key. Not a bug, but a mismatch with what we prepared for. | The partner has not added authentication yet; their README says it arrives in a later release. | Our route sends a key header only when `PARTNER_API_KEY` is set, and the header name is configurable (`PARTNER_API_KEY_HEADER`, default `X-API-Key`) because their docs do not name one. If they add a key later we change `.env`, not code. | Neither side's bug. Resolved by reading the partner's contract: no key is needed. Handled defensively by us. |
| 2 | Partner README lists `GET /categories` in id order (1, 2, 3, ...), but the API returns them alphabetically by label. | Documentation nit: the contract never promises an order. | None needed. Our feature does not call `/categories`, and any code that did must not rely on the order. | Partner's documentation, very minor. Not raised with the partner; it has no impact on our feature. |
| 3 | Our own Events page showed a blank "Date:" and "Created: Invalid Date" on every card. | The page read `event.date` and `event.created_at`, but our own API contract returns `startTime` and has no `created_at`. | Events page now reads `startTime` (showing "TBA" if missing) and only shows "Created" when the API sends it. | Our frontend (stale field names), fixed by us. The Events page now shows real dates. |
| 4 | After pulling a teammate's changes, our server would not start: `Cannot find module '...\node_modules\content-type\dist\index.js'`. The frontend also failed with `'vite' is not recognized`. | `node_modules` had been tracked in git. The teammate's push stopped tracking it, which removed or half-removed those files from our folders and left a broken mix. | Reinstalled dependencies from scratch in `WebDevApp/Server` and in `WebDevApp/mental-health`. | Our own repo and merge, fixed by us. |
| 5 | The server's `.env` file was missing from `WebDevApp/Server` after the same merge. | Most likely the same change (the file was ignored or untracked by then); we did not confirm. | Recreated `.env` with `PORT`, `SESSION_SECRET` (the merged `app.js` now requires it), `DATABASE_URL` and `PARTNER_URL`. Created `.env.example` with placeholders. Confirmed git ignores `.env` and does not track it. | Our own repo, fixed by us. |
| 6 | After the restart the server no longer printed "Connected to MentalhealthDB", which looked like the database was down. | Most likely the merged startup code no longer prints that line (we did not read it to confirm). | Tested the connection directly with a one-line query: it printed `DB OK`, and `/events` shows events stored in Postgres, so the database was fine. Lesson: a missing log line is not proof of a failed connection. | Not a bug. Checked by us. |

---

## 7. Our side as a provider (Part E)

Our own API is consumed by our downstream partner while we consume StrathShop. We watched our server terminal for `401`, `404` and `429` lines.

| # | What they reported or what we saw in our logs | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| 1 | Our downstream partner (Group 10) first asked us to add a physical location for events. | Not a bug. All our events take place on campus, and our database only stores the names of the actual campus venues (for example "Student Center, Room 2"). There is no separate physical address to add, and the existing `location` field already holds the venue. | We explained this to them on Thursday 2026-10-22 at about 6:00 PM (they had asked at about 1:00 PM), and no new field was added. We then added a note to our README and contract saying `location` is a campus venue name, not a street address, so the next reader does not ask the same thing. | Not a bug on either side. A gap in our contract wording, clarified by us. |

Two documentation gaps on our own side that we found this week (our contract and README must match what the server does):

| # | Gap | Fix | Status |
|---|---|---|---|
| a | Our README said opening the base URL shows "API running", but the merged `app.js` serves the Swagger docs page at `/`. | README now says the base URL shows the interactive API docs. | Fixed in the updated README (goes out with the final push). |
| b | Our README linked to `openapi.yaml` in the repo root and built the docs from it, but the contract now lives at `WebDevApp/Server/openapi.yaml`. | README links and the docs build command now use the new path. | Fixed in the updated README (goes out with the final push). |
| c | Our README's examples show event `evt_1` with `"cancelled":false`, but the live data had `evt_1` with `"cancelled":true` (we cancelled it while testing PATCH earlier and did not reset it). | Reset `evt_1` to not cancelled so the live data matches the README. | Done: we reset `evt_1`, and `GET /api/events/evt_1` now returns `"cancelled":false`, so the live data matches the README. |
| d | Our README said the server prints `Connected to MentalhealthDB` on start, but the merged code only prints `Server running on http://localhost:3000`. | README now says so and points to `GET /api/events` as the way to check the database. | Fixed in the updated README (goes out with the final push). |
| e | Our README's example list showed one event, but the live list has several, and the first by start time is not the one shown. | README now says the live list has several events and shows one of them. | Fixed in the updated README (goes out with the final push). |
| f | Group 10 asked for a physical location on events, which showed our contract did not say what `location` holds. | `location` is now described in the README (Event fields table and partner notes) and in `openapi.yaml` as a campus venue name, not a street address. | Fixed in the updated README and `openapi.yaml` (goes out with the final push). |

Known limitation (not a partner report): our API is exposed to other teams through a temporary Cloudflare tunnel whose address changes every time the tunnel is restarted, and which only works while our laptop is on and online. Anyone holding an old address would see errors. We keep the tunnel window open during demos and update the README with the current address.

---

## 8. Collaboration

- **Our contact on the partner team:** James Kimani (API Lead). Our teammate Collins was in touch with him on WhatsApp.
- **Check-in with the instructor or TA:** slot booked for 12:30. We did not record what was discussed.
- **What we asked or told the partner, and when:** Monday 2026-10-19, 1:48 PM, on WhatsApp: Collins asked James for their README and `openapi.yaml` for the IAP lab, and for a URL we could use to reach their API. Replies: an acknowledgement at 1:53 PM, then at 1:57 PM their live API address and a link to their GitHub repo.
- **What our downstream partner asked us, and what we did:** On Thursday 2026-10-22 at about 1:00 PM, Group 10 (RideCompare) asked us to add a physical location to events. At about 6:00 PM the same day, one of our team members explained to them that all our events take place on campus and that our database only stores the actual campus venue names, so there was no separate physical address to add. We then clarified in our README and contract that `location` is a campus venue name, not a street address.

---

## 9. Demo rehearsal

Rehearsed in three steps: (1) the page shows live partner data, (2) the partner is unreachable and the page shows its fallback message, (3) the partner is restored and the data comes back. Rehearsed on Monday 2026-10-19, in the afternoon. In the failure step the page showed the "unavailable" message and our server terminal logged `ECONNREFUSED`; the data came back after `PARTNER_URL` was restored (see section 5).

### November 10, 2026 - StrathShop API v2 Migration
- **Symptom:** Received a deprecation notice from Group 8 (StrathShop) stating that `/api/listings` is being replaced by `/api/v2/listings` with a new wrapped response shape `{ data, count }`.
- **What changed:** We updated our `partner.js` adapter to point the `v2` path to `/v2/listings`. We updated our `.env` to use `PARTNER_VERSION=v2`.
- **Whose code was it:** Upstream partner (StrathShop) breaking change.
- **Resolution:** Because we abstracted the partner fetch into a versioned adapter, the migration took 1 minute. We tested it, confirmed the page loaded live data (`stale: false`), and informed Team 8 to check their `/stats` to see our v2 calls. Nothing broke because we were warned.
- **Follow-up (13 November 2026):** Group 8 confirmed that their `/v2/listings` is live. Our Render server runs with `PARTNER_VERSION` defaulting to v2 and shows live data (`stale: false`).
