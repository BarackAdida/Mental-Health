const express = require('express');
const pool = require('../db/config');
const { recordPartnerFallback } = require('../monitoring');
const { fetchWithRetry } = require('../resilientFetch');
const { versions } = require('../partner');

const router = express.Router();
const CACHE_TTL_MS = 60_000;

let lastGood = null;

function failureReason(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout';
  if (typeof err?.cause?.code === 'string' && /^[A-Z0-9_]+$/.test(err.cause.code)) {
    return err.cause.code;
  }
  const status = /^partner returned (\d{3})$/.exec(err?.message || '');
  if (status) return `partner returned ${status[1]}`;
  if (err?.message === 'unexpected v1 shape' || err?.message === 'unexpected v2 shape') {
    return err.message;
  }
  return 'unexpected partner response or request failure';
}

function serveFallback(res, reason) {
  recordPartnerFallback();
  console.error('partner call failed:', reason);
  if (lastGood) return res.json({ data: lastGood.data, stale: true, asOf: lastGood.asOf });
  return res.status(502).json({ message: 'Partner data unavailable' });
}

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
  const versionName = process.env.PARTNER_VERSION || 'v1';
  const ver = versions[versionName];

  if (!partnerUrl) return serveFallback(res, 'PARTNER_URL is not configured');
  if (!ver) return serveFallback(res, 'unsupported PARTNER_VERSION');

  const partnerTarget = `${partnerUrl}${ver.path}`;
  if (lastGood?.partnerTarget === partnerTarget && Date.now() - lastGood.cachedAt < CACHE_TTL_MS) {
    return res.json({ data: lastGood.data, stale: false, asOf: lastGood.asOf });
  }

  const headers = {};
  if (process.env.PARTNER_API_KEY) {
    headers[process.env.PARTNER_API_KEY_HEADER || 'X-API-Key'] = process.env.PARTNER_API_KEY;
  }

  try {
    const r = await fetchWithRetry(
      partnerTarget,
      { headers },
      { timeoutMs: 1500, retries: 2, delayMs: 200 }
    );

    if (!r.ok) throw new Error(`partner returned ${r.status}`);

    const body = await r.json();
    const data = ver.parse(body);

    await syncPartnerDoctors(data);

    lastGood = { data, asOf: new Date().toISOString(), cachedAt: Date.now(), partnerTarget };
    return res.json({ data, stale: false, asOf: lastGood.asOf });
  } catch (err) {
    return serveFallback(res, failureReason(err));
  }
});

module.exports = router;