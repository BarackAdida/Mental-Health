// WebDevApp/Server/traffic.js
// Send a mix of real requests to YOUR API, so /stats and the log have data.
// Run:
//   API=http://localhost:3000 KEY=<your-real-key> N=200 node traffic.js
const API = process.env.API || 'http://localhost:3000';
const KEY = process.env.KEY;
const N = Number(process.env.N || 60);

// Weighted mix — hit the events API (the only key-gated router) hard, plus
// the paths your partner actually calls, plus a few obvious failures.
const mix = [
  // Happy path (200s)
  { method: 'GET', path: '/api/events',          key: true },
  { method: 'GET', path: '/api/events',          key: true },
  { method: 'GET', path: '/api/events',          key: true },
  { method: 'GET', path: '/api/events/evt_1',    key: true },
  { method: 'GET', path: '/api/events/evt_1',    key: true },

  // Not found (404)
  { method: 'GET', path: '/api/events/evt_99999', key: true },
  { method: 'GET', path: '/api/no-such-thing',    key: true },

  // Auth failures (401)
  { method: 'GET', path: '/api/events',            key: 'wrong' },
  { method: 'GET', path: '/api/events',            key: false  },
  { method: 'GET', path: '/api/events/saved',      key: true   }, // no session -> 401
  { method: 'GET', path: '/api/doctors',           key: true   }, // no session -> 401
  { method: 'GET', path: '/api/appointments',      key: true   }, // no session -> 401

  // Partner proxy (200 or 502)
  { method: 'GET', path: '/api/partner/counseling', key: false },
];

const pick = () => mix[Math.floor(Math.random() * mix.length)];

async function main() {
  if (!KEY) {
    console.error('KEY is required (set KEY=<your-real-key>).');
    process.exit(1);
  }
  console.log(`Sending ${N} requests to ${API}`);
  const summary = {};

  for (let i = 0; i < N; i++) {
    const req = pick();
    const headers = {};
    if (req.key === true) headers['X-API-Key'] = KEY;
    else if (req.key === 'wrong') headers['X-API-Key'] = 'definitely-wrong';

    let tag;
    try {
      const r = await fetch(`${API}${req.path}`, { method: req.method, headers });
      tag = `${req.method} ${req.path} -> ${r.status}`;
    } catch (err) {
      tag = `${req.method} ${req.path} -> ERR`;
    }
    summary[tag] = (summary[tag] || 0) + 1;
  }

  console.log('\n=== Summary ===');
  for (const k of Object.keys(summary).sort()) {
    console.log(`${k}  (x${summary[k]})`);
  }
}

main();