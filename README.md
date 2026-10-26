# Mental Health App - Events API

## Overview

The Events API lets another application read the campus mental-health events our team publishes (workshops, peer support circles, and similar). It is built for partner teams, such as Group 10 (RideCompare), who need to list upcoming events, check whether an event is cancelled, and filter events by date. Reading events needs an API key. Creating, updating and deleting events is for admins only and is meant to be run on your own copy (see [Run it locally](#run-it-locally)).

- **Live URL:** `https://mental-health-l6ub.onrender.com`
- **Hosting:** the API runs on Render's free tier with a shared database. When it has been idle it goes to sleep, so the first request can take about a minute. If a request times out or returns an HTML error page instead of JSON, wait a minute and try again, or use [Run it locally](#run-it-locally).
- **Is the server up?** Opening the base URL in a browser shows the interactive API docs (Swagger). The events themselves are under `/api/events`.
- **Stack:** Node.js + Express + PostgreSQL
- **Full reference** (every endpoint, field and error): the interactive docs at the base URL above, built from the contract at [`WebDevApp/Server/openapi.yaml`](WebDevApp/Server/openapi.yaml). A static copy is in [`docs/index.html`](docs/index.html); rebuild it with `npx @redocly/cli@v1-archive build-docs WebDevApp/Server/openapi.yaml -o docs/index.html` if the contract changes.
- **Scope:** this README documents the Events API only. The server also has `/api/auth/*` and other routes that are not part of the contract.

Last verified against the live API: TO CONFIRM (update after the Render check below).

---

## Quickstart: make your first request

You need an API key. We give each partner team its own key privately (direct message, never in this repo). Replace `<your-api-key>` with yours. Copy and paste this:

```bash
curl -H "X-API-Key: <your-api-key>" https://mental-health-l6ub.onrender.com/api/events
```

> **Windows PowerShell:** type `curl.exe` instead of `curl`. Plain `curl` in PowerShell is a different command.

You should get `200` and a JSON array of events, sorted by start time. The live list has several events; one of them looks like this (the array is `[]` if there are no events):

```json
[{"id":"evt_1","title":"Exam Season Stress Workshop","description":"Drop-in session with a campus counselor","location":"Student Center, Room 2","startTime":"2026-11-15T14:00:00.000Z","cancelled":false}]
```

Next, fetch one event by its id:

```bash
curl -H "X-API-Key: <your-api-key>" https://mental-health-l6ub.onrender.com/api/events/evt_1
```

```json
{"id":"evt_1","title":"Exam Season Stress Workshop","description":"Drop-in session with a campus counselor","location":"Student Center, Room 2","startTime":"2026-11-15T14:00:00.000Z","cancelled":false}
```

To use a local copy instead, replace the live URL with `http://localhost:3000`.

---

## Reading events (API key required)

### List events

`GET /api/events`, with optional `?after=YYYY-MM-DD`. It returns events starting on or after that date, sorted by start time.

```bash
curl -H "X-API-Key: <your-api-key>" "https://mental-health-l6ub.onrender.com/api/events?after=2026-11-01"
```

Response `200`: an array of events (same shape as above). A date with no matching events returns `200` and `[]`.

### Get one event

`GET /api/events/{id}`. Ids look like `evt_1`. Check the `cancelled` field before sending anyone to an event.

Response `200`: one event object (same shape as above).

### Event fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Looks like `evt_1` |
| `title` | string | |
| `description` | string or `null` | |
| `location` | string | Name of the venue as free text, like `Student Center, Room 2` or `Karura Forest`. There is no separate street address or coordinates field |
| `startTime` | string | ISO 8601 UTC, like `2026-11-15T14:00:00.000Z` |
| `cancelled` | boolean | `true` if the event is cancelled |

---

## Authentication and rate limit

Every request to `GET /api/events` and `GET /api/events/{id}` must carry your key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: <your-api-key>" https://mental-health-l6ub.onrender.com/api/events
```

- Each partner team has its own key, so we can tell callers apart and revoke one without affecting the others. Never put a key in code, in a README, or in a public repo.
- No key, or a wrong key: `401` with `{"message":"Missing or invalid API key"}`.
- Rate limit: **100 requests per minute per key.** Over the limit you get `429` with a `Retry-After` header (seconds to wait) and a JSON body:

```json
{"message":"Too many requests","retryAfter":42}
```

- Call from your own server, not from browser code, so your key is never visible to your users. If you call too often, cache the last result for a short time instead of refetching.
- The interactive docs page at the base URL stays open (it holds no event data).

---

## Errors

Failed requests use a normal HTTP error status and a JSON body with a `message` field:

```json
{"message":"No event found with that id"}
```

So: **a `2xx` status means success. Anything `4xx` or `5xx` means failure, and `message` says why.**

| Status | When | Example `message` |
|---|---|---|
| `400` | Bad input: invalid `after` date, missing required field, bad `startTime`, `cancelled` not true/false | `after must be a real date like 2026-08-31` |
| `401` | No key or a wrong key on `GET /api/events`, or an admin endpoint called without logging in | `Missing or invalid API key`, `You must be logged in` |
| `403` | Logged in, but not an admin | `Admin access required` |
| `429` | More than 100 requests per minute with the same key. Wait `Retry-After` seconds | `Too many requests` |
| `404` | No event with that id (or a malformed id) | `No event found with that id` |
| `500` | Server or database problem | `Failed to fetch events` |

Real examples (add `-i` to see the status line):

```bash
curl -i -H "X-API-Key: <your-api-key>" https://mental-health-l6ub.onrender.com/api/events/evt_999
# 404  {"message":"No event found with that id"}

curl -i -H "X-API-Key: <your-api-key>" "https://mental-health-l6ub.onrender.com/api/events?after=notadate"
# 400  {"message":"after must be a real date like 2026-08-31"}
```

Note: the login and signup endpoints under `/api/auth` report errors as `{"error":"..."}` instead of `{"message":"..."}`.

---

## Run it locally

**You need:** [Node.js](https://nodejs.org) 18 or newer (the server uses Express 5), [PostgreSQL](https://www.postgresql.org/download/) running on port 5432 (tested on version 18), and Git. On Windows, `psql` and `createdb` live in `C:\Program Files\PostgreSQL\<version>\bin` and may not be on your PATH. If a command is "not recognized", use the full path.

### 1. Clone and install

```bash
git clone https://github.com/BarackAdida/Mental-Health.git
cd Mental-Health/WebDevApp/Server
npm install
```

### 2. Create the database and tables

```bash
createdb -U postgres healthDB
psql -U postgres -d healthDB -f db/setup.sql
```

Enter your Postgres password when asked. You should see three `CREATE TABLE` lines.

### 3. Configure `.env`

In `WebDevApp/Server`, copy `.env.example` to `.env`, then put your real Postgres password in `DATABASE_URL`:

```
PORT=3000
SESSION_SECRET=change-me-to-a-long-random-string
API_KEYS=ourteam:make-a-long-random-key-here
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/healthDB
```

Never commit `.env`.

### 4. Start the server

```bash
npm start
```

You should see `Server running on http://localhost:3000`. It does not print a database message, so confirm the connection with step 5 below. Leave this terminal open and use a second one for the commands below.

### 5. Check it works

```bash
curl -H "X-API-Key: make-a-long-random-key-here" http://localhost:3000/api/events
```

Expected on a fresh database: `[]`.

### 6. Create an admin and the first event

This makes the examples above match what you see (the first event gets the id `evt_1`).

**macOS / Linux / Git Bash:**

```bash
curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d '{"name":"Admin","email":"admin@example.com","password":"admin12345"}'
psql -U postgres -d healthDB -c "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin12345"}'
curl -b /tmp/cookies.txt -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d '{"title":"Exam Season Stress Workshop","description":"Drop-in session with a campus counselor","location":"Student Center, Room 2","startTime":"2026-11-15T14:00:00Z"}'
```

**Windows PowerShell** (PowerShell mangles quotes inside `-d`, so the JSON goes in files):

```powershell
Set-Content "$env:TEMP\signup.json" '{"name":"Admin","email":"admin@example.com","password":"admin12345"}'
curl.exe -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" --data-binary "@$env:TEMP\signup.json"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d healthDB -c "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"
Set-Content "$env:TEMP\login.json" '{"email":"admin@example.com","password":"admin12345"}'
curl.exe -c "$env:TEMP\cookies.txt" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" --data-binary "@$env:TEMP\login.json"
Set-Content "$env:TEMP\event.json" '{"title":"Exam Season Stress Workshop","description":"Drop-in session with a campus counselor","location":"Student Center, Room 2","startTime":"2026-11-15T14:00:00Z"}'
curl.exe -b "$env:TEMP\cookies.txt" -X POST http://localhost:3000/api/events -H "Content-Type: application/json" --data-binary "@$env:TEMP\event.json"
```

Expected from the last command, status `201`:

```json
{"id":"evt_1","title":"Exam Season Stress Workshop","description":"Drop-in session with a campus counselor","location":"Student Center, Room 2","startTime":"2026-11-15T14:00:00.000Z","cancelled":false}
```

---

## Admin endpoints (local only)

These need an admin session cookie from step 6, so run them against your own copy (`http://localhost:3000`). The cookie is called `connect.sid`. `-b` sends the cookie file saved by the login command. There are no API keys or Bearer tokens in this version.

The examples show bash. On PowerShell, put the JSON in a file with `Set-Content` and send it with `--data-binary "@file"`, as in step 6, and use `$env:TEMP\cookies.txt` for the cookie file.

### Create an event

`POST /api/events`. Required: `title`, `location`, `startTime` (ISO 8601). Optional: `description`.

```bash
curl -b /tmp/cookies.txt -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d '{"title":"Peer Support Circle","location":"Library Annex, Room 4","startTime":"2026-11-20T17:00:00Z"}'
```

Response `201`:

```json
{"id":"evt_2","title":"Peer Support Circle","description":null,"location":"Library Annex, Room 4","startTime":"2026-11-20T17:00:00.000Z","cancelled":false}
```

### Update an event

`PATCH /api/events/{id}`. Send only the fields you want to change: `title`, `description`, `location`, `startTime`, `cancelled`.

```bash
curl -b /tmp/cookies.txt -X PATCH http://localhost:3000/api/events/evt_1 -H "Content-Type: application/json" -d '{"cancelled":true}'
```

Response `200` (the full updated event):

```json
{"id":"evt_1","title":"Exam Season Stress Workshop","description":"Drop-in session with a campus counselor","location":"Student Center, Room 2","startTime":"2026-11-15T14:00:00.000Z","cancelled":true}
```

### Delete an event

`DELETE /api/events/{id}`

```bash
curl -i -b /tmp/cookies.txt -X DELETE http://localhost:3000/api/events/evt_2
```

Response `204 No Content` (empty body).

Without a login these return `401 {"message":"You must be logged in"}`. With a non-admin login they return `403 {"message":"Admin access required"}`.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Live URL is very slow or returns an HTML error page | The free Render server was asleep. Wait a minute and retry, or use [Run it locally](#run-it-locally). |
| `401` with `Missing or invalid API key` | The `X-API-Key` header is missing, misspelled, or the key is wrong. |
| `429 Too many requests` | You went over 100 requests per minute. Wait `Retry-After` seconds, or cache results. |
| `GET /api/events` returns `500` with `Failed to fetch events`, or the terminal shows `ECONNREFUSED` | The database is not reachable: PostgreSQL is not running, or `DATABASE_URL` points at the wrong port. Start the Postgres service and check it is on port 5432. |
| `password authentication failed` | The password in `DATABASE_URL` in `.env` does not match your Postgres password. |
| `database "healthDB" does not exist` | You skipped step 2. Run `createdb -U postgres healthDB`, then load `db/setup.sql`. |
| `EADDRINUSE` or "port already in use" | Something else is using port 3000. Stop it, or change `PORT` in `.env`. |
| `GET /api/events` returns `[]` | The database is empty. That is normal on a fresh install. Do step 6 to add the first event. |
| `curl` in PowerShell prints odd output or an error about parameters | Use `curl.exe` instead of `curl`. |

## Notes for partner teams

- Event locations: `location` is the venue name only, as plain text. There is no separate address, map link or coordinates field.
- CORS: the server only allows browser requests from `http://localhost:5173`. `curl` and server-to-server calls are not affected, but a website on another address will be blocked by the browser until we add its address.
