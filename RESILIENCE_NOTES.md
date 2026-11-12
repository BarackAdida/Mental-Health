# Week 11 — Resilience Notes

## 1) What I tested

Partner: StrathShop (`https://strathshop.onrender.com/api`). Drilled locally 
against `flaky-partner.js` (same endpoint and response shape) to accurately 
control timeout, failure, and retry scenarios.

| Failure | How I triggered it | What the user saw | What my log said |
|---|---|---|---|
| Partner flaky | Mock `flaky` mode (503) | Live data, no banner (retries succeeded silently) | `attempt 1 failed, retrying in 200 ms`, `attempt 2 failed, retrying in 400 ms` |
| Partner slow | Mock `slow` mode (10s delay) | Yellow banner: "Showing saved data from [time]" after 5s wait | `partner call failed: timeout` |
| Partner error | Mock `error` mode (500) | Yellow banner: "Showing saved data from [time]" | `partner call failed: partner returned 500` |
| No cache + slow | Restarted backend, mock `slow` | Red error: "Services unavailable right now" | `partner call failed: timeout` |

*(Screenshots of the banner and error states are saved in `/docs`)*

## 2) My numbers, and why

- **Normal response time**: ~15–50 ms locally (measured from the `flaky` run's first successful attempt).
- **Timeout**: 1500 ms. Chosen because normal calls are well under 500 ms, so 1500 ms leaves room for a bad moment without making the user wait too long.
- **Retries**: 2, with delays of 200 ms, then 400 ms. 
- **Worst-case wait for timeout/5xx retries**: `(2 retries + 1 initial) × 1500 ms + 200 ms + 400 ms = 5100 ms`. For `429`, the implementation honors `Retry-After`, capped at 5 seconds per retry, so two rate-limit waits can extend the overall worst case to 14.5 seconds.
- **Mock call count**: Verified that exactly 3 HTTP requests (1 initial + 2 retries) hit the partner during an outage. No infinite loops.

Automated checks also verify the timeout signal, the two-retry cap, retries for 5xx responses, and no retry for 401/404 responses or write requests. These local tests do not replace the live partner failure drill.

## 3) What a real user would experience without this code

Without this code, a student opening the Campus Support page to book a counseling session would see a blank screen and a loading spinner for as long as StrathShop takes to respond — potentially 10+ seconds if the partner is having a slow moment. Most users would assume the page is broken, refresh, and send a second hanging request, doubling the load on the struggling partner. If StrathShop were down, the user would see a hard crash or a red error message, and they would leave the page without booking. With this code, the worst a user sees is the exact same list of counselors they saw five minutes ago, with a clear banner stating it is saved data, allowing them to still read the information.

## 4) What I did not build

A circuit breaker — a switch that stops calling a partner that has been failing for a while, and periodically tests whether it's back. My route still tries every request three times (1 attempt + 2 retries) even when the partner has been failing for hours. A circuit breaker would detect the sustained failure and short-circuit straight to the saved-data fallback, cutting the user's wait from 5.1 seconds down to ~1 ms.