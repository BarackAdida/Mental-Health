// middleware/apiKeyAuth.js
// Week 9: every request to /api must carry a valid key in the X-API-Key header.
//
// Keys come from the environment, never from source code. One key per consumer:
//   API_KEYS=ringpartner:<long-random-string>,ourteam:<another-long-random-string>
// (A plain key with no "name:" is also accepted and is named key1, key2, ...)
const crypto = require('crypto');

function parseKeys(raw) {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const at = entry.indexOf(':');
      return at === -1
        ? { name: `key${i + 1}`, key: entry }
        : { name: entry.slice(0, at), key: entry.slice(at + 1) };
    })
    .filter((c) => c.key);
}

// Compare in constant time so response timing does not help a guesser.
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function apiKeyAuth({ keys = process.env.API_KEYS, headerName = 'X-API-Key', log = console } = {}) {
  const consumers = parseKeys(keys);

  if (consumers.length === 0) {
    // No keys configured (for example a deployment that has not been given any yet).
    log.warn('API key check is OFF: API_KEYS is not set, so /api is open. Set API_KEYS to turn it on.');
    return (req, res, next) => next();
  }

  // Count only, never print the keys themselves.
  log.log(`API key check is ON (${consumers.length} key(s) loaded)`);

  return (req, res, next) => {
    const sent = req.get(headerName);
    const match = sent && consumers.find((c) => safeEqual(sent, c.key));
    if (!match) {
      return res.status(401).json({ message: 'Missing or invalid API key' });
    }
    req.apiKey = match.key; // used by the rate limiter
    req.consumer = match.name; // safe to log; never log the key
    next();
  };
}

module.exports = { apiKeyAuth, parseKeys };
