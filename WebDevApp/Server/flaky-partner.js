const express = require('express');
const app = express();

let mode = 'ok'; // ok | slow | flaky | error
let calls = 0;

const listings = [
  {
    id: 17, title: '1-on-1 Counseling Session', price: 1500,
    description: '50-minute confidential session with a licensed campus counselor.',
    category: 'counseling', condition: 'N/A', status: 'available',
    imageUrl: 'https://placehold.co/400x300?text=Counseling',
    sellerName: 'Dr. Wanjiku Mwangi', sellerCampus: 'Strathmore University',
    datePosted: '2026-09-11T08:50:22.000Z', providerName: 'Dr. Wanjiku Mwangi',
  },
  {
    id: 18, title: 'Exam Stress & Anxiety Workshop', price: 500,
    description: 'Small-group session on managing exam pressure.',
    category: 'counseling', condition: 'N/A', status: 'available',
    imageUrl: 'https://placehold.co/400x300?text=Stress',
    sellerName: 'Dr. Wanjiku Mwangi', sellerCampus: 'Strathmore University',
    datePosted: '2026-09-11T08:50:22.000Z', providerName: 'Dr. Wanjiku Mwangi',
  },
];

app.get('/_mode/:m', (req, res) => {
  mode = req.params.m;
  calls = 0;
  res.json({ mode });
});

app.get('/listings', async (req, res) => {
  calls += 1;
  console.log(`GET /listings (call ${calls}, mode ${mode})`);

  if (mode === 'slow') {
    await new Promise((r) => setTimeout(r, 10000));
  }
  if (mode === 'flaky' && calls % 3 !== 0) {
    return res.status(503).json({ message: 'Try again' });
  }
  if (mode === 'error') {
    return res.status(500).json({ message: 'boom' });
  }
  if (req.query.category !== 'counseling') {
    return res.json([]);
  }
  res.json(listings);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`flaky-partner listening on http://localhost:${PORT}`));