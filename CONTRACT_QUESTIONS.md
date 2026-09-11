# Contract Questions — Group 8 (Upstream: StrathShop API v2.1.0)


1. **What happens if two people try to book the same listing at the same time?**
   `PATCH /listings/{id}/availability` only has two states in the
   `status` enum: `available` and `booked`. If two students both see a
   `CounselingListing` as `available` and both try to book it at nearly
   the same moment, what stops both requests from succeeding? Is there a
   "pending" or "held" state we're missing, or does the last write just
   win?

2. **Is a listing one specific appointment slot, or a recurring offering?**
   `CounselingListing` still has no date or time field, just
   `providerName`. Once a listing is marked `booked`, does a new listing
   get created for the counselor's next available slot, or does the same
   listing flip back to `available` after some time passes? We need to
   know this to show a real time to the student, not just "available or
   not."

3. **Is there any auth required to call the PATCH endpoint?**
   `/listings/{id}/availability` is a write endpoint that changes real
   marketplace data, but there's no security scheme anywhere in the spec.
   Can literally anyone call this and flip a listing to `booked`, or is
   there an API key / auth header expected that just isn't documented
   here?
