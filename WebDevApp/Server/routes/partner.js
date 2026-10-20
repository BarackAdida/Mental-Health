// routes/partner.js
// Week 10: calls the upstream partner (Group 8, StrathShop) from OUR server,
// so the partner URL (and a key, if they ever add one) never reach the browser.
//
// Mounted in app.js as:  app.use('/api/partner', require('./routes/partner'));
// Frontend calls:        GET /api/partner/counseling
const express = require('express');

const router = express.Router();

// Only the fields our page needs, named exactly as in the partner's contract.
const pick = (l) => ({
  id: l.id,
  title: l.title,
  description: l.description,
  price: l.price,
  status: l.status,
  providerName: l.providerName,
});

const unavailable = (res) =>
  res.status(502).json({ message: 'Partner data unavailable' });

router.get('/counseling', async (req, res) => {
  const partnerUrl = process.env.PARTNER_URL;
  if (!partnerUrl) {
    console.error('partner call skipped: PARTNER_URL is not set in .env');
    return unavailable(res);
  }

  // Their README says no auth yet. Only send a key if one is configured.
  // Header name is configurable because their docs do not name one.
  const headers = {};
  if (process.env.PARTNER_API_KEY) {
    headers[process.env.PARTNER_API_KEY_HEADER || 'X-API-Key'] =
      process.env.PARTNER_API_KEY; // never log this value
  }

  try {
    const r = await fetch(`${partnerUrl}/listings?category=counseling`, { headers });
    if (!r.ok) {
      console.error('partner returned', r.status); // status only, never the key
      return unavailable(res);
    }
    const listings = await r.json();
    if (!Array.isArray(listings)) {
      console.error('partner returned an unexpected shape (not an array)');
      return unavailable(res);
    }
    // Shape check: the contract says every counseling listing has providerName.
    const bad = listings.filter((l) => typeof l.providerName !== 'string');
    if (bad.length) {
      console.error(`partner shape check: ${bad.length} listing(s) missing providerName`);
    }
    return res.json(listings.map(pick));
  } catch (err) {
    // ECONNREFUSED = nothing listening; ENOTFOUND = hostname is wrong
    const why =
      err.cause?.code || err.cause?.errors?.[0]?.code || err.cause?.message || err.message;
    console.error('partner call failed:', why);
    return unavailable(res);
  }
});

module.exports = router;
