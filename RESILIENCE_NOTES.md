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
- **Worst-case wait**: `(2 retries + 1 initial) × 1500 ms + 200 ms + 400 ms = 5100 ms`. The user waits at most ~5.1 seconds before seeing saved data, which is acceptable for a booking page.
- **Mock call count**: Verified that exactly 3 HTTP requests (1 initial + 2 retries) hit the partner during an outage. No infinite loops.

## 3) What a real user would experience without this code

Without this code, a student opening the Campus Support page to book a counseling session would see a blank screen and a loading spinner for as long as StrathShop takes to respond — potentially 10+ seconds if the partner is having a slow moment. Most users would assume the page is broken, refresh, and send a second hanging request, doubling the load on the struggling partner. If StrathShop were down, the user would see a hard crash or a red error message, and they would leave the page without booking. With this code, the worst a user sees is the exact same list of counselors they saw five minutes ago, with a clear banner stating it is saved data, allowing them to still read the information.

## 4) Circuit breaker (built after the first version of these notes)

The first version of this project retried every request three times (1 attempt + 2 retries) even when the partner had been failing for hours, so every user could wait up to 5.1 seconds.

I added a circuit breaker (`circuitBreaker.js`, used in `routes/partner.js`):

- **Closed (normal):** every request calls StrathShop.
- **Open:** after 3 failed requests in a row the route stops calling StrathShop for 30 seconds. It serves the last good data flagged `stale: true` straight away, or 502 if nothing is saved. The wait drops from up to 5.1 s to a few milliseconds. These requests still count as partner fallbacks in `/stats`.
- **Half-open:** after 30 seconds exactly one trial call goes out. If it succeeds the circuit closes. If it fails the circuit opens again with a fresh 30 seconds.
- A success resets the count, so the 3 failures must be in a row.
- Settings: `CIRCUIT_FAILURES` (default 3) and `CIRCUIT_COOLDOWN_MS` (default 30000).

**Tested:** 6 unit tests for the breaker and 4 route tests (open with and without saved data, a good trial closes it, a failed trial keeps it open). The partner is mocked in all of them.

## 5) What I did not build

- The breaker state is in memory, so it resets when the server restarts.
- I have not drilled the breaker against `flaky-partner.js` or a real StrathShop outage; the tests use mocks.
- The circuit state is only written to the log (`partner circuit OPEN` / `CLOSED`). It is not shown in `/stats`.
