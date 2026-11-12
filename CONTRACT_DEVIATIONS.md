## Week 6
- No contract deviations found. 
- Implementation matches `openapi.yaml`. No changes required.

Tests
POST /api/auth/login 401 52.842 ms - 31
GET /api/events/saved 200 8.411 ms - 244
DELETE /api/events/1/save 200 15.276 ms - 52
GET /api/events/saved 200 26.106 ms - 2
POST /api/events/1/save 200 72.704 ms - 50
DELETE /api/events/999 404 12.345 ms - 30
POST /api/events/999/save 404 58.765 ms - 30
DELETE /api/events/42 404 9.876 ms - 30
POST /api/events/42/save 404 63.210 ms - 30
DELETE /api/events/1000 404 14.567 ms - 30
POST /api/events/1000/save 404 55.432 ms - 30

## Week 11 — Partner resilience
- The partner proxy returns `{ data, stale, asOf }` on success or stale-cache fallback, and a `502` JSON message when no saved response exists. The Campus Support page displays the stale timestamp or an unavailable message.
- Retries are limited to GET requests: 429 and 5xx responses plus network/timeouts may be retried; 4xx responses and writes are not retried. The 429 `Retry-After` delay is capped at five seconds per retry.
- The route logs a normalized failure reason without logging partner URLs, headers, keys, or response bodies. Automated tests cover retry/fallback behavior; the latest live partner failure/recovery drill still needs to be recorded separately.

## Week 12 — Monitoring
- `GET /stats` is available at the server root, requires an API key, and reports process-local request totals, 4xx/5xx counts, timings, route aggregates, and partner fallback count.
- Request logs omit query strings and bodies, and identify authenticated callers with a short key hash. The historical tracked `requests.log` is now removed from the Git index but remains local and is ignored for future commits.
- `MONITORING_NOTES.md` contains a previous traffic snapshot. Its recorded Render partner-authentication explanation conflicts with the earlier `INTEGRATION_LOG.md` note that StrathShop required no key at the time. Reconcile those two historical observations with the team before presenting the cause as settled.

## Week 13 — Versioning
- The v1 response shape remains at `/api/events` and `/api/v1/events`; v2 is available at `/api/v2/events`. This is an intentional versioned contract change, not an accidental mismatch.
- V1 router responses carry `Deprecation`, `Sunset`, and successor `Link` headers. The planned sunset is November 20, 2026. A notice draft exists, but delivery and acknowledgment by Group 10 are not recorded.
- The StrathShop adapter supports `PARTNER_VERSION=v1|v2`, and its cache is now isolated by upstream URL/version. The default remains v1 because no confirmed upstream v2 notice or live v2 response is documented. Live migration evidence is outstanding.