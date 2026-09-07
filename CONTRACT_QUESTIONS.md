# Contract Questions — Group 8 (Upstream: Marketplace API)

These are 3 questions after reading through Group 8's openapi.yaml.

1. **Is there any authentication on `/students` and `/students/{id}`?**
   Both endpoints return a full `Student` object with `fullName` and `email`
   in it, but there is no security section anywhere in the file. `GET
   /students?email=...` looks like anyone who knows or guesses a student's
   email could look up their full name and account status with no login
   required. Is auth actually required in the real server and just not
   written into the spec, or is this endpoint meant to be public?

2. **How would we know when a counselor is available for `CounselingListing`?**
   `CounselingListing` only has `id`, `title`, `price`, `description`,
   `category`, and `providerName`. There's no date, time, or availability
   field. If a user books through `/listings`, how do we know when Dr.
   Wanjiku Mwangi (or whoever) is actually free? Is availability handled
   somewhere else, or is that something we're supposed to track ourselves?

3. **Is there a way to tell how fresh a listing is?**
   Neither `WellnessListing` nor `CounselingListing` has an `updatedAt` or
   similar timestamp field. `stockAvailable` on `WellnessListing` is just
   `true`/`false`, not a quantity or a last-checked time. If stock changes
   between when we fetch it and when a user tries to act on it, is there
   any way for us to detect that from the response itself?
