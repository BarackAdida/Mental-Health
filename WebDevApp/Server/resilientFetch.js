// WebDevApp/Server/resilientFetch.js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

async function fetchWithRetry(url, options = {}, config = {}) {
  const { timeoutMs = 1500, retries = 2, delayMs = 200 } = config;
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? retries : 0; // never retry writes

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let wait = delayMs * 2 ** attempt; // 200ms, then 400ms
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if ((res.status !== 429 && res.status < 500) || attempt >= maxRetries) {
        return res;
      }

      if (res.status === 429) {
        const retryAfter = retryAfterMs(res.headers.get('Retry-After'));
        if (retryAfter !== null) wait = Math.min(retryAfter, 5000);
      }
    } catch (err) {
      if (attempt >= maxRetries) throw err;
    }

    console.warn(`attempt ${attempt + 1} failed, retrying in ${wait} ms`);
    await sleep(wait);
  }
}

module.exports = { fetchWithRetry };