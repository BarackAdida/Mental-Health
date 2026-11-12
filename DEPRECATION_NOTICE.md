# Deprecation Notice: Events API v1

We are introducing a breaking change to `GET /api/events` to improve pagination support.

### What is changing:
1. The response is now wrapped in an object: `{ "data": [...], "count": 5 }`
2. Field names inside the objects remain the same.

### What is NOT changing:
- Your `X-API-Key` works exactly the same.
- `POST`, `PATCH`, and `DELETE` requests remain unchanged.

### How to migrate:
Change your code to read from `response.data` instead of the root array.

### Timeline:
- **Today:** v2 is live at `/api/v2/events`. v1 still works at `/api/events`.
- **November 20, 2026:** v1 will stop working.

If you have questions, message us!