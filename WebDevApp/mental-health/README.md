
# API – Server Setup

Simple steps to get the server running locally.

---

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node)

---

## 1. Install Dependencies

Navigate to the `server` folder and run:

```bash
npm install
```

---

## 2. Configure Environment Variables

Create a `.env` file in the `server` folder with the following content:

```env
PORT=5000
SESSION_SECRET=your_secret_key_here
```

> ⚠️ Replace `your_secret_key_here` with any random string (e.g., `abc123!@#`).

---

## 3. Start the Server

```bash
npm start
```

For development with auto‑restart (optional):

```bash
npx nodemon index.js
```

---

## 4. Verify

The server will be running at **http://localhost:5000**.

You should see the message: `Doctor API running` when you visit that URL in your browser.

---

## Notes

- The database is stored in `server/db/db.json`. It is created automatically with empty user/doctor lists.
- All doctor routes require an active session (login via `/api/auth/login` or signup `/api/auth/signup`).

That’s it – your API is ready for local testing.