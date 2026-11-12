#!/usr/bin/env node
/*
 * Checks the live Events API against what the README says, and (optionally)
 * updates the "Last verified" line in README.md if every required check passes.
 *
 * Usage (Node 18+, no installs needed):
 *   bash / Git Bash:   API_KEY=your-key node scripts/verify-live.js
 *   PowerShell:        $env:API_KEY="your-key"; node scripts/verify-live.js
 *   Update README too: add  --write-readme
 *
 * The key is read from the environment and is never printed or written anywhere.
 * Optional: LIVE_URL overrides the base URL (default: our Render URL).
 */
const fs = require('fs');
const path = require('path');

const BASE = (process.env.LIVE_URL || 'https://mental-health-l6ub.onrender.com').replace(/\/$/, '');
const KEY = process.env.API_KEY;
const WRITE_README = process.argv.includes('--write-readme');

if (!KEY) {
  console.error('Set API_KEY first (see the usage notes at the top of this file).');
  process.exit(2);
}

async function call(p, { key = true, timeout = 90000 } = {}) {
  const headers = key ? { 'X-API-Key': KEY } : {};
  const res = await fetch(BASE + p, { headers, signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, headers: res.headers, text, body };
}

const results = [];
async function check(name, required, fn) {
  try {
    const problem = await fn();
    const ok = !problem;
    results.push({ name, required, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}${required ? '    ' : ' (info)'}  ${name}${ok ? '' : '  -> ' + problem}`);
  } catch (e) {
    results.push({ name, required, ok: false });
    console.log(`FAIL${required ? '    ' : ' (info)'}  ${name}  -> ${e.message}`);
  }
}
const FIELDS = ['id', 'title', 'location', 'startTime', 'cancelled'];
const hasFields = (e) => e && FIELDS.every((f) => f in e);

(async () => {
  console.log(`Checking ${BASE} (the first call may take about a minute if the server was asleep)\n`);
  let firstId = null;

  await check('Base URL opens the docs page (200)', true, async () => {
    const r = await call('/', { key: false });
    return r.status === 200 ? null : `got ${r.status}`;
  });

  await check('v2 list with no key -> 401', true, async () => {
    const r = await call('/api/v2/events', { key: false });
    return r.status === 401 ? null : `got ${r.status}`;
  });

  await check('v2 list with key -> 200 and { data, count }', true, async () => {
    const r = await call('/api/v2/events');
    if (r.status !== 200) return `got ${r.status}`;
    if (!r.body || !Array.isArray(r.body.data)) return 'body.data is not an array';
    if (r.body.count !== r.body.data.length) return 'count does not match data length';
    if (r.body.data.length && !r.body.data.every(hasFields)) return 'an event is missing a documented field';
    if (r.body.data.length) firstId = r.body.data[0].id;
    return null;
  });

  await check('v2 get one event -> 200 and { data: event }', true, async () => {
    if (!firstId) return 'no events to fetch (add one, then rerun)';
    const r = await call(`/api/v2/events/${firstId}`);
    if (r.status !== 200) return `got ${r.status}`;
    return r.body && hasFields(r.body.data) ? null : 'body.data is not a full event';
  });

  await check('v2 ?after=2026-11-01 -> 200 and { data, count }', true, async () => {
    const r = await call('/api/v2/events?after=2026-11-01');
    return r.status === 200 && r.body && Array.isArray(r.body.data) ? null : `got ${r.status}`;
  });

  await check('v2 ?after=not-a-date -> 400 with a message', true, async () => {
    const r = await call('/api/v2/events?after=not-a-date');
    return r.status === 400 && r.body && r.body.message ? null : `got ${r.status}`;
  });

  await check('v2 unknown id -> 404 with a message', true, async () => {
    const r = await call('/api/v2/events/evt_999999');
    return r.status === 404 && r.body && r.body.message ? null : `got ${r.status}`;
  });

  await check('v1 /api/events -> 200 array with Deprecation and Sunset headers', true, async () => {
    const r = await call('/api/events');
    if (r.status !== 200) return `got ${r.status}`;
    if (!Array.isArray(r.body)) return 'body is not a bare array';
    if (r.headers.get('deprecation') !== 'true') return 'no Deprecation header';
    return r.headers.get('sunset') ? null : 'no Sunset header';
  });

  await check('README example event evt_1 exists', false, async () => {
    const r = await call('/api/v2/events/evt_1');
    return r.status === 200 ? null : `got ${r.status} (update the README examples)`;
  });

  await check('Partner route /api/partner/counseling answers (200 or 502)', false, async () => {
    const r = await call('/api/partner/counseling', { key: false });
    console.log(`        (status ${r.status}${r.body && 'stale' in r.body ? ', stale=' + r.body.stale : ''})`);
    return [200, 502].includes(r.status) ? null : `got ${r.status}`;
  });

  const required = results.filter((r) => r.required);
  const passed = required.filter((r) => r.ok).length;
  const allOk = passed === required.length;
  console.log(`\n${passed}/${required.length} required checks passed.`);

  if (!allOk) {
    console.log('Fix the failures above, then rerun. The README was not changed.');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const line = `Last verified against the live API: ${today} (scripts/verify-live.js, ${passed}/${required.length} checks passed).`;
  if (!WRITE_README) {
    console.log('\nAll good. Paste this line into README.md, or rerun with --write-readme:\n' + line);
    return;
  }
  const readme = path.join(__dirname, '..', 'README.md');
  const text = fs.readFileSync(readme, 'utf8');
  const re = /^Last verified against the live API:.*$/m;
  if (!re.test(text)) {
    console.log('Could not find the "Last verified" line in README.md. Paste this instead:\n' + line);
    return;
  }
  fs.writeFileSync(readme, text.replace(re, line));
  console.log('\nREADME.md updated:\n' + line);
})();
