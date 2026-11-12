# Week 13: Versioning Notes

## Part A: My Breaking Change
I wrapped the `GET /api/events` response in `{ data: [...], count: N }`. This is worth a break because it allows us to add pagination later without changing the root shape again. I predict my partner's code will fail on the `response.map(...)` loop, as it will now receive an object instead of an array.

## Parts B–C: Side-by-side rollout

- `/api/v1/events` and the old `/api/events` alias preserve the v1 array/object response shapes.
- `/api/v2/events` returns `{ data, count }` for lists and `{ data }` for one event.
- V1 responses receive `Deprecation`, `Sunset`, and `Link` headers. The planned sunset is November 20, 2026.
- Local contract tests cover v1 shape preservation, v2 wrapping, authentication, and the deprecation headers.

## Part D: Notice delivery

The notice is drafted in [DEPRECATION_NOTICE.md](./DEPRECATION_NOTICE.md). The repository does not contain evidence that Group 10 has received or acknowledged it, so sending and confirming receipt remain outstanding.

## Part E: Receiving a breaking change

As of November 12, 2026, the integration record does not contain an upstream deprecation notice or a confirmed StrathShop v2 response contract. The integration has v1 and v2 response adapters, but changing `PARTNER_VERSION` to v2 before confirming the endpoint and response with Group 8 could turn partner errors into a stale-data fallback and hide a failed migration. Keep `PARTNER_VERSION=v1` until that contract and a live successful response are confirmed.

## Part F: Reflection and evidence still needed

The personal reflection is intentionally left for the student to complete from their own experience receiving a real partner notice. Before submission, record how and when the notice arrived, what was clear or missing, what was done first, and one improvement to the notice sent to the downstream team.

Also capture a live `/stats` or request-log check showing v2 partner traffic, and confirm whether any downstream caller still uses v1 before retiring it. The local automated tests are not evidence of partner receipt or live partner migration.
