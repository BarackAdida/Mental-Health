function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  return (req, res, next) => {
    const id = req.apiKey;
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
