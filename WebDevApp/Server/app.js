const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const pgSession = require('connect-pg-simple')(session);
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const pool = require('./db/config');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const { rateLimit } = require('./middleware/rateLimit');
const { monitor, statsHandler } = require('./monitoring');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(monitor);
app.set('trust proxy', 1); 

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json());

app.use(session({
  store: process.env.NODE_ENV === 'test' 
  ? new session.MemoryStore() 
  : new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd, 
    sameSite: isProd ? 'none' : 'lax', 
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));

const keyCheck = apiKeyAuth();
const limiter = rateLimit({ windowMs: 60000, max: 100 });
const partnerLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  keyFn: (req) => req.ip || req.socket.remoteAddress,
});
const isSiteUserRoute = (req) => req.path === '/saved' || /^\/[^/]+\/save$/.test(req.path);

const eventsAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.is_admin) return next();
  if (req.session && req.session.userId && isSiteUserRoute(req)) return next();
  return keyCheck(req, res, next);
};

const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

app.use('/api/v1/events', eventsAuth, limiter, v1Router);
app.use('/api/v2/events', eventsAuth, limiter, v2Router);
app.use('/api/events', eventsAuth, limiter, v1Router);

app.use('/api/partner', partnerLimiter, require('./routes/partner'));
app.use('/api/appointments', require('./routes/appointments'));
app.get('/stats', keyCheck, limiter, statsHandler);

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  console.error('request error:', err.message);
  if (status >= 400 && status < 500) return res.status(status).json({ message: 'Invalid request' });
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;