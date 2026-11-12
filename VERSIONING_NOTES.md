# Week 13: Versioning Notes

## Part A: My Breaking Change
I wrapped the `GET /api/events` response in `{ data: [...], count: N }`. This is worth a break because it allows us to add pagination later without changing the root shape again. I predict my partner's code will fail on the `response.map(...)` loop, as it will now receive an object instead of an array.

## Part E: Receiving a Breaking Change
