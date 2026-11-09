# Week 12 — Monitoring Notes

## Part A — Predictions (made before any data)

**Slowest endpoint I expect:** `GET /api/partner/counseling`. Reason: it
makes an outbound `fetch` to `PARTNER_URL`, so its latency is dominated by
the partner's server and by network round-trips. Every other route talks
only to Postgres.

**Most error-prone endpoint I expect:** `GET /api/events/*`. Reason: it is
the only router behind `apiKeyAuth`. Any caller without the right
`X-API-Key` gets a 401 here and nowhere else. Secondary failures:
`GET /api/events/:id` for nonexistent ids (404), and
`GET /api/partner/counseling` when the partner is down (502).

## Part E — What the data actually shows

Deployed at https://mental-health-l6ub.onrender.com.
Traffic: 100 requests + 300 requests from my own key, plus my own curl checks.
Snapshot taken at uptime 206s, total 408 requests.

### 1) Prediction vs. data

| Prediction | Actual (from `/stats`) | Match? |
|---|---|---|
| `/api/partner/counseling` slowest on average | avgMs = **340.7**, vs. next slowest 66 (`/api/events`) | ✅ yes |
| `/api/events/*` has most 4xx | `(no route)` bucket: **118 clientErrors** — mostly 401s from `keyCheck` on `/api/events` and from `requireAuth` on `/api/events/saved` | ✅ yes (indirectly — the 401s never reach a route, so they land in `(no route)`) |
| `/api/partner/counseling` 502s rare | 32 of 32 requests failed — 100% failure rate, `partnerFallbacks: 32` | ❌ **completely wrong** — but for a good reason (see §3) |

### 2) One real pattern, with numbers

`GET /api/partner/counseling` averaged **340.7 ms** and its slowest call was
**747 ms** across 32 calls — and **32 of those 32 calls returned 502** (100%
failure). Meanwhile `GET /api/events` averaged **66 ms** (max **1060 ms**,
which was the cold-start first request) and `GET /api/events/saved` averaged
just **1.4 ms** because the 401 from `requireAuth` returns before any DB
query. `GET /api/events/:id` had **31 of 98 calls (31.6%) return 404** — every
single one was my own `traffic.js` probing `evt_99999`.

### 3) Why I think it happens, and what I'd check next

- **Partner 502s → resolved.** During the first traffic runs, `[GET] /api/partner/counseling`
  showed **32 of 32 calls returning 502** and `partnerFallbacks` sitting at **32**.
  Root cause: `PARTNER_API_KEY` was missing from Render's environment, so `partner.js`
  sent no auth header to StrathShop, which returned 401, which the route mapped to 502.
  This was diagnosed in under a minute using only `/stats` — the `partnerFallbacks`
  counter climbing alongside `serverErrors` on that exact route told us the partner
  was rejecting our calls, not that it was slow or down. Once the env var was added,
  `partnerFallbacks` stopped climbing and the endpoint returns 200. That is the whole
  point of the counter — you cannot tell 401-from-partner from 404-from-partner from
  timeout-from-partner without a proxy-side count.
- **Cold-start tail.** The first successful `/api/partner/counseling` after a fix
  took **1017.7 ms**; warm calls run ~100–200 ms. Both StrathShop and my own API are
  on Render's free tier, which spins down services after 15 min idle. The `maxMs` on
  that route will keep the cold-start outlier visible — a real production system
  would run a warm-up ping every 10 min or upgrade to a plan without spin-down.
- **`/api/events/:id` 404s.** 31 of 98 calls returned 404 — every single one was
  `evt_99999` from my own `traffic.js`. Real partner traffic won't probe nonexistent
  IDs. The log confirms: every 404 line has `caller: "key-338823"` (my key).
- **`(no route)` 4xx mix.** 118 client errors split into 401s from `keyCheck`
  (bad/missing key, shown as `caller: "none"`) and 401s from `requireAuth` on
  `/api/events/saved` (shown as `caller: "key-338823"`, proving keyCheck passed
  and the session layer rejected). Both are working as designed — two independent
  auth layers, each rejecting its own kind of request.

### 4) One alert I'd want in production

**Alert:** `errorRatePercent > 2` for **5 minutes** (5xx only — 4xx is
usually the caller's fault).

**Context from this run:** during the traffic test, `errorRatePercent` sat at
**7.8%** because every `/api/partner/counseling` call returned 502. A 2%
threshold would have paged an on-call engineer within 5 minutes.

**On fire, three things should happen:**
1. Page the on-call engineer with a link to `/stats` and the request log.
2. While a human is being paged, `routes/partner.js` is already returning
   502 with a clean JSON message — so users see a fast failure, not a hung
   request. That is the Week-11 fallback doing its job.
3. If `partnerFallbacks` is rising at the same time as `errorRatePercent`,
   the partner is the suspect — short-circuit `/api/partner/counseling` to
   return `{ degraded: true }` with cached data until the upstream recovers.

## Appendix — raw `/stats` snapshot

```json
{
    "startedAt": "2026-11-09T09:03:51.138Z",
    "uptimeSeconds": 206,
    "total": 408,
    "clientErrors": 189,
    "serverErrors": 32,
    "errorRatePercent": 7.8,
    "avgMs": 54.4,
    "routes": {
        "(no route)": {
            "count": 146,
            "clientErrors": 118,
            "serverErrors": 0,
            "avgMs": 1.2,
            "maxMs": 20.6
        },
        "[GET] /stats": {
            "count": 2,
            "clientErrors": 0,
            "serverErrors": 0,
            "avgMs": 1.7,
            "maxMs": 2.5
        },
        "[GET] /api/events": {
            "count": 90,
            "clientErrors": 0,
            "serverErrors": 0,
            "avgMs": 66,
            "maxMs": 1060
        },
        "[GET] /api/events/:id": {
            "count": 98,
            "clientErrors": 31,
            "serverErrors": 0,
            "avgMs": 52.4,
            "maxMs": 100.6
        },
        "[GET] /api/partner/counseling": {
            "count": 32,
            "clientErrors": 0,
            "serverErrors": 32,
            "avgMs": 340.7,
            "maxMs": 747
        },
        "[GET] /api/events/saved": {
            "count": 40,
            "clientErrors": 40,
            "serverErrors": 0,
            "avgMs": 1.4,
            "maxMs": 6.9
        }
    },
    "partnerFallbacks": 32
}

{"time":"2026-11-09T09:06:58.463Z","method":"GET","path":"/api/events","status":401,"ms":0.7,"caller":"none"}
{"time":"2026-11-09T09:06:58.819Z","method":"GET","path":"/api/events","status":200,"ms":49.8,"caller":"key-338823"}
{"time":"2026-11-09T09:06:59.136Z","method":"GET","path":"/api/events","status":401,"ms":0.6,"caller":"none"}
{"time":"2026-11-09T09:07:00.206Z","method":"GET","path":"/api/appointments","status":401,"ms":0.7,"caller":"none"}
{"time":"2026-11-09T09:07:01.259Z","method":"GET","path":"/api/events/saved","status":401,"ms":0.7,"caller":"key-338823"}
{"time":"2026-11-09T09:07:03.081Z","method":"GET","path":"/api/events/evt_99999","status":404,"ms":49.6,"caller":"key-338823"}
{"time":"2026-11-09T09:07:07.313Z","method":"GET","path":"/api/partner/counseling","status":502,"ms":534,"caller":"none"}
{"time":"2026-11-09T09:07:16.188Z","method":"GET","path":"/stats","status":200,"ms":1,"caller":"key-338823"}