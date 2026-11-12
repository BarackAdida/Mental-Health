# Deprecation notice: Events API v1

**Status:** Draft — confirm delivery and receipt with the downstream team before
marking this notice as sent.

**To:** Group 10 (RideCompare)
**From:** Mental-Health API team
**Date:** November 12, 2026

## Summary

Events API v2 is available at `/api/v2/events`. The old `/api/events` and
`/api/v1/events` routes continue to work for now, but will be retired on
**November 20, 2026**.

## What is changing

- Event lists are wrapped as `{ "data": [...], "count": N }`.
- A single event is wrapped as `{ "data": { ... } }`.
- The existing event field names, IDs, `X-API-Key` authentication, and query
  parameter `after` are unchanged.
- Admin create/update requests use the same request body, but their v2
  successful responses wrap the event in `{ "data": { ... } }`.
- Delete still returns `204 No Content`.

## Why

The wrapper gives the API a stable place to add pagination metadata without
another breaking change to the list response.

## Before and after

v1 `GET /api/events`:

```json
[{"id":"evt_17","title":"Exam Stress Workshop","location":"Student Center","startTime":"2026-11-15T14:00:00.000Z","cancelled":false}]
```

v2 `GET /api/v2/events`:

```json
{"data":[{"id":"evt_17","title":"Exam Stress Workshop","location":"Student Center","startTime":"2026-11-15T14:00:00.000Z","cancelled":false}],"count":1}
```

## How to migrate

1. Change `/api/events` to `/api/v2/events`.
2. Read list items from `body.data` instead of the root response array.
3. Read a single event from `body.data`.
4. Keep sending the same `X-API-Key` and `?after=` filter.
5. Test the change and let us know so we can confirm the v2 calls in our logs.

## Timeline

- **November 12, 2026:** v2 is available; v1 remains supported and returns
  deprecation headers.
- **November 20, 2026:** planned v1 sunset. Please migrate before this date.

## Questions

Please contact the Mental-Health API team if you need help or more time.