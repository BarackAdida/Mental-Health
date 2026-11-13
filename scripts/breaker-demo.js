#!/usr/bin/env node
/*
 * Live demo of the circuit breaker, in ONE command. Run from the repo root:
 *
 *     node scripts/breaker-demo.js
 *
 * What it does: starts a fake StrathShop that always answers 500, starts our
 * real server code pointed at it, and sends 5 requests to our partner route.
 * It never touches your real database or the live StrathShop.
 */
const http = require('http');

// Set the environment BEFORE the app loads. These win over anything in .env.
process.env.NODE_ENV = 'test';                       // in-memory sessions, no database needed
process.env.SESSION_SECRET = 'demo-secret';
process.env.DATABASE_URL = 'postgres://demo:demo@127.0.0.1:1/demo'; // never used
process.env.API_KEYS = 'demo:demo-key';
process.env.PARTNER_URL = 'http://127.0.0.1:4010';
process.env.PARTNER_VERSION = 'v1';                  // the fake partner serves /listings

// Quiet the logs, but keep the circuit breaker messages.
const say = (s) => process.stdout.write(s + '\n');
console.log = () => {};
console.error = () => {};
console.warn = (...a) => {
  if (String(a[0]).includes('circuit')) say('   >> ' + a[0]);
};

let partnerCalls = 0;
const fakePartner = http.createServer((req, res) => {
  partnerCalls += 1;
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end('{"message":"boom"}');
});

const app = require('../WebDevApp/Server/app');

fakePartner.listen(4010, () => {
  const server = app.listen(3100, async () => {
    say('Fake StrathShop is DOWN (always answers 500). Sending 5 requests to our server:\n');
    for (let i = 1; i <= 5; i++) {
      const t0 = process.hrtime.bigint();
      const res = await fetch('http://127.0.0.1:3100/api/partner/counseling');
      const secs = Number(process.hrtime.bigint() - t0) / 1e9;
      say(`request ${i}: HTTP ${res.status} in ${secs.toFixed(3)} s   (calls made to StrathShop so far: ${partnerCalls})`);
    }
    say('\nRequests 1-3 each try StrathShop 3 times. After 3 failures the breaker opens,');
    say('so requests 4-5 are answered in milliseconds and make no new calls to StrathShop.');
    server.close();
    fakePartner.close();
    process.exit(0);
  });
});
