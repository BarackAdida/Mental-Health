Downstream Partner- Group 10
Upstream Partner- Group 8

PART B
a)Team 10 would find our Events a resources. Based on their RideCompare
audit, they could use event location information as a destination for providing ride comparison for users.

b)Team 10 would only need to read the relevant information. They would not need to create, update, or delete our Users.

c)Our audit does not state Event locations at the moment.

PART C
a)Group 8 manages Users, Listings, and Categories. The most useful resources for our group are Listings and Categories.

b)We would mainly need read access to Listings and Categories.

c)We should not expect access to sensitive marketplace user information such as passwords or personal information.

d)The marketplace data should reflect the latest information available when we make API requests.

PART D
1. Team 10 needs to read a list of upcoming events with title and location, in order to offer them as pre-filled ride destinations.*
   - Freshness: within the hour is fine
   - Volume: once per app load
   - Auth: none — public data

2. Team 10 needs to know whether an event has been cancelled, in order to avoid pointing a user toward a ride destination that's no longer valid.*
   - Freshness: current at time of booking
   - Volume: once per event selected
   - Auth: none
   - Gap flagged: cancelled status does not currently exist on the Events resource in our Week 1 audit — needs to be added.

3. Team 10 needs to filter events to only those happening today or later, in order to avoid suggesting rides to events that have already ended.*
   - Freshness: date-level real-time
   - Volume: once per list fetch
   - Auth: none

PART E
Downstream gap:
Team 10's proposed use depends on event and appointment locations, but Group

9's audit does not list location fields. This must be confirmed before designing the API.

Upstream limitation:
Group 8's audit lists Textbooks, Electronics, Fashion, Furniture, Services, and
Food as categories. It does not provide a Wellness/Self-Care category, so Group 9 should not assume that category exists.



PART F
We do not need to share all our data with our partners. Team 10 mainly needs information about our events and appointments, while we can use listings and categories from Group 8. We also noticed that some information, like locations, is not clearly included in our audit. We therefore need to check what data is available before creating the API. 

