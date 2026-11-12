// WebDevApp/Server/monitoring.js
const crypto = require('crypto');

const round = (n) => Math.round(n * 10) / 10;

function who(req) {
  if (!req.apiKey) return 'none';
  const hash = crypto.createHash('sha256').update(req.apiKey).digest('hex');
  return 'key-' + hash.slice(0, 6);
}

// Read req.route while it's still set. Returns null if no route matched.
function captureRoute(req) {
  if (req.route && typeof req.route.path === 'string') {
    const base = req.baseUrl || '';
    const p = req.route.path;
    const full = p === '/' ? (base || '/') : base + p;
    return `[${req.method}] ${full}`;
  }
  return null;
}

const stats = {
  startedAt: new Date().toISOString(),
  total: 0,
  clientErrors: 0,
  serverErrors: 0,
  totalMs: 0,
  routes: {},
};

function newRoute() {
  return { count: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0 };
}

const partnerFallbacks = { count: 0 };
function recordPartnerFallback() {
  partnerFallbacks.count += 1;
}

function monitor(req, res, next) {
  const start = process.hrtime.bigint();
  let routeCaptured = null;

  for (const m of ['json', 'send', 'end', 'write']) {
    const orig = res[m];
    res[m] = function (...args) {
      if (!routeCaptured) routeCaptured = captureRoute(req);
      return orig.apply(res, args);
    };
  }

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const label = routeCaptured || captureRoute(req) || '(no route)';

    console.log(JSON.stringify({
      time: new Date().toISOString(),
      method: req.method,
      path: req.baseUrl + req.path,
      status: res.statusCode,
      ms: round(ms),
      caller: who(req),
    }));

    const r = stats.routes[label] || newRoute();
    stats.routes[label] = r;

    stats.total += 1;
    stats.totalMs += ms;

    r.count += 1;
    r.totalMs += ms;
    r.maxMs = Math.max(r.maxMs, ms);

    if (res.statusCode >= 500) {
      stats.serverErrors += 1;
      r.serverErrors += 1;
    } else if (res.statusCode >= 400) {
      stats.clientErrors += 1;
      r.clientErrors += 1;
    }
  });

  next();
}

function statsHandler(req, res) {
  const routes = {};
  for (const [label, r] of Object.entries(stats.routes)) {
    routes[label] = {
      count: r.count,
      clientErrors: r.clientErrors,
      serverErrors: r.serverErrors,
      avgMs: round(r.totalMs / r.count),
      maxMs: round(r.maxMs),
    };
  }
  const rate = stats.total ? (stats.serverErrors / stats.total) * 100 : 0;
  const avg = stats.total ? stats.totalMs / stats.total : 0;

  res.json({
    startedAt: stats.startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    total: stats.total,
    clientErrors: stats.clientErrors,
    serverErrors: stats.serverErrors,
    errorRatePercent: round(rate),
    avgMs: round(avg),
    routes,
    partnerFallbacks: partnerFallbacks.count,
  });
}

module.exports = { monitor, statsHandler, recordPartnerFallback };