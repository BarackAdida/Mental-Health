# Week 13: Versioning Notes

## Part A: My Breaking Change
I wrapped the `GET /api/events` response in `{ data: [...], count: N }`. This is worth a break because it allows us to add pagination later without changing the root shape again. I predict my partner's code will fail on the `response.map(...)` loop, as it will now receive an object instead of an array.

## Part E: Receiving a Breaking Change
I received StrathShop's notice on 10 November. It was very well-written. It clearly explained that they were wrapping their list responses in a `{ data, count }` object and moving to `/api/v2`. It even provided before-and-after JSON examples, which made it easy to see exactly what code needed to change. 

Because we had already abstracted our partner calls into a single `partner.js` adapter file with a `v2` parser ready, the migration only required changing `PARTNER_VERSION=v2` in our `.env` file. When I tested the page, it loaded live data with no "stale data" banner, proving the migration was successful and our Week 11 fallback didn't need to intervene. I would not change anything about their notice—it was a perfect example of how to communicate a breaking change.