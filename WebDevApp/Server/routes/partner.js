const express = require('express');
const { recordPartnerFallback } = require('../monitoring');
const { fetchWithRetry } = require('../resilientFetch');

const router = express.Router();

const pick = (l) => ({
  id: l.id,
  title: l.title,
  description: l.description,
  price: l.price,
  status: l.status,
  providerName: l.providerName,
});

// In-memory "last known good" — cleared on restart, by design (see handout Part D).
let lastGood = null; // { data, asOf }

router.get('/counseling', async (req, res) => {
  const partnerUrl = process.env.PARTNER_URL;
  if (!partnerUrl) {
    console.error('partner call skipped: PARTNER_URL is not set in .env');
    recordPartnerFallback();
    if (lastGood) {
      return res.json({ data: lastGood.data, stale: true, asOf: lastGood.asOf });
    }
    return res.status(502).json({ message: 'Partner data unavailable' });
  }

  const headers = {};
  if (process.env.PARTNER_API_KEY) {
    headers[process.env.PARTNER_API_KEY_HEADER || 'X-API-Key'] =
      process.env.PARTNER_API_KEY;
  }

  try {
    const r = await fetchWithRetry(
      `${partnerUrl}/listings?category=counseling`,
      { headers },
      { timeoutMs: 1500, retries: 2, delayMs: 200 }
    );

    if (!r.ok) {
      throw new Error(`partner returned ${r.status}`);
    }

    const listings = await r.json();
    if (!Array.isArray(listings)) {
      throw new Error('partner returned unexpected shape (not an array)');
    }

    const bad = listings.filter((l) => typeof l.providerName !== 'string');
    if (bad.length) {
      console.error(`partner shape check: ${bad.length} listing(s) missing providerName`);
    }

    const data = listings.map(pick);
    lastGood = { data, asOf: new Date().toISOString() };
    return res.json({ data, stale: false, asOf: lastGood.asOf });
  } catch (err) {
    const reason =
      err.name === 'TimeoutError'
        ? 'timeout'
        : err.cause?.code || err.cause?.message || err.message;
    console.error('partner call failed:', reason);
    recordPartnerFallback();

    if (lastGood) {
      return res.json({ data: lastGood.data, stale: true, asOf: lastGood.asOf });
    }
    return res.status(502).json({ message: 'Partner data unavailable' });
  }
});

module.exports = router;