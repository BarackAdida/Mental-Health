# Week 14 — Retrospective

### 1. The hardest part of the lifecycle
The hardest stage for our team was **Integration (Week 10/11)**. Getting the StrathShop API to work reliably was difficult because their Render server would frequently cold-start. We had to implement a resilient fetch with a timeout and a saved-data fallback just to keep our page from hanging for 10 seconds when they were down.

### 2. One real cross-team issue
In Week 11, we discovered our `/api/partner/counseling` route was returning a 502. We spent hours thinking our fallback code was broken. We eventually realized that the `PARTNER_API_KEY` was missing from our Render environment variables. StrathShop was returning a `401 Unauthorized`, which our code correctly mapped to a 502. Once we added the key to Render, it instantly worked.

### 3. What I would design differently
If we started over, I would have added a `/stats` monitoring endpoint from Week 5, not Week 12. Being able to see exact error rates and response times in the dashboard would have helped us debug the StrathShop 401 issue much faster. I would keep our auth middleware exactly the same, as it worked flawlessly.

### 4. My contribution
I rate my contribution an **8/10**. I owned the core backend routing, the Week 9 API key security, and the Week 11 resilience features. I also wrote the frontend React page for Campus Support. I did not write all the Jest tests initially, but I refactored them for Demo Day so the suite would pass.