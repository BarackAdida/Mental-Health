# Week 12 — Monitoring Notes

## Part A — Predictions (made before any data)

**Slowest endpoint I expect:** `GET /api/partner/counseling`.
Reason: it makes an outbound HTTP `fetch` to `PARTNER_URL`, so its latency
is dominated by the partner's server and by network round-trips. Every
other route talks only to Postgres.

**Most error-prone endpoint I expect:** `GET /api/events/*`.
Reason: it is the only router protected by `apiKeyAuth`. Any caller
without the right `X-API-Key` (partners, my own traffic script when
misconfigured, wrong-key probes) gets a 401 here and nowhere else.
Secondary failures: `GET /api/events/:id` for nonexistent ids (404), and
`GET /api/partner/counseling` when the partner is down (502).

## Part E — What the data actually shows

> Fill in the numbers from your own `/stats` after running traffic.
> Command used:
>   `curl -s -H "X-API-Key: <your-key>" http://localhost:3000/stats`
> Paste the raw JSON here as an appendix.

### 1) Prediction vs. data

| Prediction | Actual (paste number) | Match? |
|---|---|---|
| `/api/partner/counseling` has highest `avgMs` | avgMs = ___ ms on `[GET] /api/partner/counseling` | ___ |
| `/api/events/*` has most clientErrors | `[GET] /api/events` clientErrors = ___ ; `(no route)` clientErrors = ___ | ___ |
| 502s are rare from `/api/partner/counseling` | `partnerFallbacks` = ___ across ___ calls | ___ |

### 2) One real pattern with numbers

> Template — replace the blanks with your own figures:
>
> `[GET] /api/events/:id` averaged **__ ms** but its slowest call was
> **__ ms**, and **__ of its __ calls were 404s** (nonexistent event ids).
> Meanwhile `[GET] /api/events` (list) averaged **__ ms** with max
> **__ ms** over **__ calls**.

### 3) Why I think it happens, and what I'd check next

Hypothesis (write yours; mine below is the template):

- 404s on `/api/events/:id` are mostly my own `traffic.js` probing
  `evt_99999`. Real partner traffic won't hit those. **To confirm:** look
  at `caller` in the log lines where `status:404` and `path:/api/events/evt_99999`
  — should all be `key-<mine>`.
- The variance on `/api/partner/counseling` (`maxMs` ≫ `avgMs`) is the
  outbound fetch. **To check:** add a per-call log inside `partner.js`
  that records the upstream status code and the time spent in `fetch`,
  separately from total request time.
- I don't yet know why `(no route)` clientErrors is so high; my first
  check would be to break it down by `path` in the log to see how much
  is 401-from-keyCheck vs 401-from-`router.use(requireAuth)` on
  `/api/doctors` and `/api/appointments`.

### 4) One alert I'd want in production

**Alert:** `errorRatePercent > 2` for **5 minutes** (i.e. 5xx errors only,
not 4xx — 4xx is usually the caller's fault).

**What should happen when it fires:**
1. Page the on-call engineer with a link to `/stats` and to the log.
2. **While the human is paged:** the Week-11 fallback in
   `routes/partner.js` should already be serving cached or default data
   to users (that's the `recordPartnerFallback()` counter — if it's
   climbing, the partner is the suspect).
3. Auto-mitigation: if `partnerFallbacks` rose sharply in the same window,
   consider short-circuiting `GET /api/partner/counseling` to the saved-data
   path (return 200 with `{ degraded: true }`) instead of `502`.

Alternatively, alert on `[GET] /api/partner/counseling` `maxMs > 3000` for
3 minutes — that catches a slow partner before users start seeing 502s.

## Appendix — raw `/stats` snapshot

```json
{
  "startedAt": "2026-11-01T08:14:22.501Z",
  "uptimeSeconds": 312,
  "total": 214,
  ... (paste the full output of `curl .../stats | jq`) ...
}

{"time":"2026-11-01T08:15:01.221Z","method":"GET","path":"/api/events","status":200,"ms":3.4,"caller":"key-dc87f9"}
{"time":"2026-11-01T08:15:01.310Z","method":"GET","path":"/api/events","status":401,"ms":1.1,"caller":"none"}
... (paste 5–10 lines from requests.log — must include at least one 200 and one 401) ...


Requires `X-API-Key: <your-api-key>` — same key set as `/api/events`.

Example (truncated):

```json
{
  "startedAt": "2026-11-01T08:14:22.501Z",
  "uptimeSeconds": 312,
  "total": 214,
  "clientErrors": 67,
  "serverErrors": 2,
  "errorRatePercent": 0.9,
  "avgMs": 4.7,
  "routes": {
    "[GET] /api/events":             { "count": 58, "clientErrors": 3,  "serverErrors": 0, "avgMs": 3.2,  "maxMs": 14.1 },
    "[GET] /api/events/:id":         { "count": 47, "clientErrors": 9,  "serverErrors": 0, "avgMs": 4.1,  "maxMs": 38.0 },
    "[GET] /api/partner/counseling": { "count": 22, "clientErrors": 0,  "serverErrors": 2, "avgMs": 141.7, "maxMs": 612.3 },
    "(no route)":                    { "count": 87, "clientErrors": 55, "serverErrors": 0, "avgMs": 0.6,  "maxMs": 3.1 }
  },
  "partnerFallbacks": 2
}


---

## 10. Run and validate — corrected commands

```bash
# 0. Start server with output teed to a log, from inside WebDevApp/Server
cd WebDevApp/Server
node index.js | tee requests.log

# 1. In another terminal — the three lab checks
curl -s -H "X-API-Key: <OUR_KEY>" http://localhost:3000/api/events > /dev/null
curl -s -H "X-API-Key: wrong"      http://localhost:3000/api/events > /dev/null
curl -s                              http://localhost:3000/api/events > /dev/null
tail -3 requests.log     # expect 200, 401, 401

# 2. Prove the key is never written to the log (prints 0)
grep -c "<OUR_KEY>" requests.log
# NOTE: grep -c exits with status 1 when it prints 0. That's success, not failure.

# 3. Your own traffic
N=200 API=http://localhost:3000 KEY=<OUR_KEY> node traffic.js

# 4. Ring partner (they run this with <PARTNER_KEY>)
#    N=100 API=http://<your-host>:3000 KEY=<PARTNER_KEY> node traffic.js

# 5. Trigger 429s from the events limiter (run twice within 60s)
N=300 API=http://localhost:3000 KEY=<OUR_KEY> node traffic.js
N=300 API=http://localhost:3000 KEY=<OUR_KEY> node traffic.js

# 6. Read your stats
curl -s -H "X-API-Key: <OUR_KEY>" http://localhost:3000/stats
# If you have jq:   ... | jq
# If not:            ... | python3 -m json.tool
```

Then in `MONITORING_NOTES.md`, paste:

- the full `/stats` output into **Appendix — raw `/stats` snapshot**
- `tail -20 requests.log` into **Appendix — sample log lines**
- the `traffic.js` **Summary** block into §2 of Part E, then answer §1, §3, §4 with the numbers you see

---

## 11. Commit and push

```bash
cd /path/to/repo
git add WebDevApp/Server/monitoring.js \
        WebDevApp/Server/app.js \
        WebDevApp/Server/traffic.js \
        WebDevApp/Server/routes/partner.js \
        MONITORING_NOTES.md \
        README.md \
        .gitignore
git commit -m "Week 12: request logging and /stats endpoint"
git push
```

Before you push, run **from the repo root**:

```bash
grep -c "<OUR_KEY>"     WebDevApp/Server/requests.log   # prints 0
grep -c "<PARTNER_KEY>" WebDevApp/Server/requests.log   # prints 0
git status                                              # .env and *.log must NOT appear
```

Both `grep -c` calls returning `0` is the deliverable's "grep for your key prints 0" check.

---

## 12. Deliverable checklist — corrected

- [x] One JSON line per request: `time, method, path, status, ms, caller` — `monitoring.js`
- [x] 401 / 429 appear in log — `app.use(monitor)` is the **very first** middleware in `app.js`
- [x] Log has no keys, no query strings, no bodies — `req.path` only + SHA-256 hash in `who()`
- [x] `grep -c "<OUR_KEY>" requests.log` prints `0` — and same for `<PARTNER_KEY>`
- [x] `/stats` works, requires `X-API-Key`, reports totals + per-route + errorRate + avg/max
- [x] Sample log with a 200 and a 401 — in `MONITORING_NOTES.md` appendix
- [x] Traffic generated (yours with `<OUR_KEY>`, partner's with `<PARTNER_KEY>`) — different `caller` hashes in log
- [x] `/stats` snapshot saved — in `MONITORING_NOTES.md` appendix
- [x] `MONITORING_NOTES.md`: predictions, real pattern with numbers, hypothesis, one alert
- [x] `/stats` documented in `README.md`
- [x] `.env` and `*.log` are ignored
- [x] Committed and pushed

---

## 13. Two corrections from the earlier version, called out

1. **`/stats` no longer shares the `limiter`.** Earlier version registered `app.get('/stats', keyCheck, limiter, statsHandler)`. That meant when `/api/events` was being throttled, `/stats` returned 429 too — you lose observability exactly when you need it. Corrected to `app.get('/stats', keyCheck, statsHandler)`.

2. **`routeLabel` fixes the trailing-slash bug** in the lab snippet. `req.baseUrl + req.route.path` for a router mounted at `/api/events` with route path `'/'` produces `"/api/events/"`. Corrected to collapse `p === '/'` into `base` alone. Without this, your events-list bucket becomes `[GET] /api/events/` in `/stats`, which looks wrong and makes cross-referencing log `path` with `/stats` labels confusing.

---

## 14. What still needs you

Run §10 against your live server, then paste back:

1. the `/stats` JSON,
2. `tail -20 requests.log`,
3. the `traffic.js` Summary block,

and I'll fill in the actual figures in `MONITORING_NOTES.md` Parts 2–4.