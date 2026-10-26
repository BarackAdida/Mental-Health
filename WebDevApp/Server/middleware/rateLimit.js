// middleware/rateLimit.js
// Week 9: a simple in-memory limiter that counts requests per API key in a time window.
// It lives in this server's memory, so it resets on restart and does not work across
// several server copies. Production systems use a shared store such as Redis.
function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  return (req, res, next) => {
    const id = req.apiKey;
    // No key means the key check is off. Do not limit by IP here: behind a proxy
    // every visitor would share one address and one bucket.
    if (!id) return next();

    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many requests', retryAfter });
    }
    next();
  };
}

module.exports = { rateLimit };
