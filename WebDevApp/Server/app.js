const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',  
  credentials: true,               
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,   
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const morgan = require('morgan');
app.use(morgan('dev'));
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});