# Week 11 — Resilience Notes

## 1) What I tested

Partner: StrathShop (`https://strathshop.onrender.com/api`), drilled locally
against `flaky-partner.js` (same endpoint and response shape) for reproducible
timings, then against the real partner for confirmation.

| Failure | How I triggered it | What the user saw | What my log said |
|---|---|---|---|
| Partner stopped | `curl http://localhost:4000/_mode/error` + stop flaky-partner | — | — |
| Partner slow | `curl http://localhost:4000/_mode/slow` (10s delay) | — | — |
| Partner flaky | `curl http://localhost:4000/_mode/flaky` (2 of 3 fail) | — | — |
| Partner returns 500 | `curl http://localhost:4000/_mode/error` | — | — |

**Fill in the "saw" / "log said" columns after running the drills.** Each cell
should be one short sentence — *"saved data with banner"*, *"friendly unavailable"*,
*"`attempt 1 failed, retrying in 200 ms` then `attempt 2 failed, retrying in 400 ms`
then `partner call failed: partner returned 500`"*.

## 2) My numbers, and why

- **Normal response time** (measured in Part A, stand-in in ok mode):
  — fill in from `curl -s -o /dev/null -w "%{time_total}\n" http://localhost:4000/listings?category=counseling`
  Three runs and take the middle — probably **~5–20 ms locally**.
- **Timeout: 1500 ms.** Chosen because: normal response is well under 500 ms
  even on a cold Render deploy (my earlier real-partner measurements showed
  warm 100–300 ms, cold-start 1000 ms), so 1500 ms is comfortably above normal
  and well below a user's patience. This matches the handout's recommended value.
- **Retries: 2, delay 200 ms.** Worst-case wait:
  `(2 + 1) × 1500 + 200 + 400 = 5100 ms`. Just over five seconds — the user
  will see the saved-data banner, not a hung page.
- **No retry on 4xx** — a 401 or 404 fails identically every time. Only
  429, 500, 502, 503, 504 loop.

## 3) What a real user would experience without this code

> Concrete: name the screen, the wait, the user's next action.

**Fill in 4–6 sentences.** Template:

> Without this code, a user opening the Campus Support page would see a blank
> card and a spinner for as long as StrathShop takes to respond — up to
> **10+ seconds** if StrathShop is having a slow moment (or a full minute on
> Render's cold start). Most users would assume the page is broken and refresh,
> which sends a *second* request that also hangs — the retry doubling the load
> on an already-struggling partner. If StrathShop were returning 503s
> intermittently, the user would see the counselling list flicker in and out
> between page loads, and eventually give up and close the tab. With this code,
> the worst a user sees is the same list they saw five minutes ago, with a
> banner naming the time and saying "the partner is not responding" — which
> they can understand and work around.

## 4) What I did not build

A circuit breaker — a switch that stops calling a partner that has been failing
for a while, and periodically tests whether it's back. My route still tries
every request three times (1 attempt + 2 retries) even when the partner has
been failing for hours. A circuit breaker would detect the sustained failure
and short-circuit straight to the saved-data fallback, cutting the user's wait
from 5.1 s down to ~1 ms. It's the obvious next step if this were production;
I'm not implementing it in Week 11.