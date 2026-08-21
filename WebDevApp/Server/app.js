const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

// Load environment variables (only once)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// ---------- CORS first ----------
const corsOptions = {
  origin: 'http://localhost:5173',   // your frontend origin
  credentials: true,                // allow cookies
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// ---------- Middleware ----------
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,      // set true in production with HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// ---------- Routes ----------
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// ---------- Start server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});