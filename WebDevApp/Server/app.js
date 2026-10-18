const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const pgSession = require('connect-pg-simple')(session);
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const pool = require('./db/config');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/events', require('./routes/events'));

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;