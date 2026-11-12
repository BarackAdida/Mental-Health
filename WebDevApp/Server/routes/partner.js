const express = require('express');
const pool = require('../db/config');
const { recordPartnerFallback } = require('../monitoring');
const { fetchWithRetry } = require('../resilientFetch');
const { versions } = require('../partner');

const router = express.Router();

let lastGood = null;

async function syncPartnerDoctors(listings) {
  try {
    const activePartnerIds = listings.map(l => String(l.id));
    
    for (const item of listings) {
      const partnerId = String(item.id);
      const name = item.providerName || 'Unknown Doctor';
      
      const existing = await pool.query('SELECT id FROM doctors WHERE partner_id = $1', [partnerId]);
      
      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE doctors SET name = $1, is_active = TRUE WHERE partner_id = $2',
          [name, partnerId]
        );
      } else {
        await pool.query(
          'INSERT INTO doctors (name, specialization, license_number, phone_number, email, partner_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE)',
          [name, 'Counseling', 'PARTNER', '000', 'partner@strathmore.edu', partnerId]
        );
      }
    }

    if (activePartnerIds.length > 0) {
      await pool.query(
        'UPDATE doctors SET is_active = FALSE WHERE partner_id IS NOT NULL AND partner_id NOT IN (SELECT unnest($1::text[]))',
        [activePartnerIds]
      );
    } else {
      await pool.query('UPDATE doctors SET is_active = FALSE WHERE partner_id IS NOT NULL');
    }
  } catch (err) {
    console.error('Partner sync failed:', err);
  }
}

router.get('/counseling', async (req, res) => {
  const partnerUrl = process.env.PARTNER_URL;
  const ver = versions[process.env.PARTNER_VERSION || 'v2'];

  if (!partnerUrl) {
    recordPartnerFallback();
    if (lastGood) return res.json({ data: lastGood.data, stale: true, asOf: lastGood.asOf });
    return res.status(502).json({ message: 'Partner data unavailable' });
  }

  const headers = {};
  if (process.env.PARTNER_API_KEY) {
    headers[process.env.PARTNER_API_KEY_HEADER || 'X-API-Key'] = process.env.PARTNER_API_KEY;
  }

  try {
    const r = await fetchWithRetry(
      `${partnerUrl}${ver.path}`,
      { headers },
      { timeoutMs: 1500, retries: 2, delayMs: 200 }
    );

    if (!r.ok) throw new Error(`partner returned ${r.status}`);

    const body = await r.json();
    const data = ver.parse(body);

    await syncPartnerDoctors(data);

    lastGood = { data, asOf: new Date().toISOString() };
    return res.json({ data, stale: false, asOf: lastGood.asOf });
  } catch (err) {
    recordPartnerFallback();
    if (lastGood) return res.json({ data: lastGood.data, stale: true, asOf: lastGood.asOf });
    return res.status(502).json({ message: 'Partner data unavailable' });
  }
});

module.exports = router;