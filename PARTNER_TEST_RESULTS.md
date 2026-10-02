# Partner Test Exchange Results (Group 8 & Group 9)

## 1. Upstream Testing (Group 9 Testing Group 8 - StrathShop API)
- **Status:** All tests passed (100% success rate).
- **Executed Against:** Group 8 live server endpoints (`http://localhost:5000/api`).
- **Endpoints Covered:**
  - `GET /listings` (happy path for wellness/counseling categories, and 400 invalid category parameter)
  - `GET /listings/{id}` (200 found listing payload validation and 404 not found)
  - `PATCH /listings/{id}/availability` (200 status update to `booked`/`available`, 400 invalid status, and 404 missing ID)
  - `GET /categories` and `GET /categories/{id}` (happy path list/item return and 404 validation)
- **Findings:**
  - **Real Bugs:** None found. Group 8's implementation matched their `openapi.yaml` contract schemas precisely.
  - **Contract Ambiguities:** None. Response field types (`price` as float, `datePosted` as ISO date-time, `status` enums) strictly matched contract specs.
  - **Misunderstandings:** None.

---

## 2. Downstream Testing (Group 10 Testing Group 9 - Strathmore Mental Health App API)
- **Status:** All tests passed (100% success rate).
- **Executed Against:** Group 9 live server endpoints (`http://localhost:3000/events` & `/api/events`).
- **Endpoints Covered:**
  - `GET /events` & `GET /events?after={date}`
  - `GET /events/{id}`
  - `POST /events`
  - `PATCH /events/{id}`
  - `DELETE /events/{id}`
- **Findings:**
  - **Real Bugs:** None — all returned response shapes matched contract keys (`id` as string, `cancelled` boolean, and `{ "message": "..." }` error objects).
  - **Contract Ambiguities:** None.
  - **Misunderstandings:** None.

---

## 3. Conclusion
Both contract exchanges verified full compliance between upstream and downstream partners in the ring topology. No corrective patches or contract amendments were required during Part D.