const express = require('express');
const { recordPartnerFallback } = require('../monitoring');

const router = express.Router();

const pick = (l) => ({
  id: l.id,
  title: l.title,
  description: l.description,
  price: l.price,
  status: l.status,
  providerName: l.providerName,
});

const unavailable = (res) => {
  recordPartnerFallback();               // <- the stretch counter
  return res.status(502).json({ message: 'Partner data unavailable' });
};

router.get('/counseling', async (req, res) => {
  const partnerUrl = process.env.PARTNER_URL;
  if (!partnerUrl) {
    console.error('partner call skipped: PARTNER_URL is not set in .env');
    return unavailable(res);
  }

  const headers = {};
  if (process.env.PARTNER_API_KEY) {
    headers[process.env.PARTNER_API_KEY_HEADER || 'X-API-Key'] =
      process.env.PARTNER_API_KEY;
  }

  try {
    const r = await fetch(`${partnerUrl}/listings?category=counseling`, { headers });
    if (!r.ok) {
      console.error('partner returned', r.status);
      return unavailable(res);
    }
    const listings = await r.json();
    if (!Array.isArray(listings)) {
      console.error('partner returned an unexpected shape (not an array)');
      return unavailable(res);
    }
   
    const bad = listings.filter((l) => typeof l.providerName !== 'string');
    if (bad.length) {
      console.error(`partner shape check: ${bad.length} listing(s) missing providerName`);
    }
    return res.json(listings.map(pick));
  } catch (err) {
    const why =
      err.cause?.code || err.cause?.errors?.[0]?.code || err.cause?.message || err.message;
    console.error('partner call failed:', why);
    return unavailable(res);
  }
});

module.exports = router;
