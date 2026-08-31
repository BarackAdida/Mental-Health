| Method | Path                     | Purpose                                                                | Maps to Need |
| GET    |/events?after={date}      | Return upcoming events (title, location), filterable to today or later | Need 1: "Team 10 needs to read a list of upcoming events with title and  location..." + Need 3: "Team 10 needs to filter events to only those happening today or later..." |

| GET    | /events/{id}             | Return full detail for one event, including its cancelled status       | Need 2: "Team 10 needs to know whether an event has been cancelled..." |
| PATCH  | /events/{id}             | Update an event — e.g. set `cancelled: true`                           | Internal — closes the gap flagged under Need 2 ("cancelled status does not currently exist on the Events resource") |

| POST   | /events                  | Create a new event                                                     | Internal — an event must exist before Team 10 can read or filter it |
| DELETE | /events/{id}             | Remove an event that's no longer offered                               | Internal — completes the write/lifecycle side of the Events resource |


Row 1: Added an example using the ISO 8601 date format (/events?after=2026-08-31) to make the expected date format clearer.

Rows 2–5: No changes were made because the reviewer confirmed that the paths, HTTP methods, pluralization, and nesting follow REST conventions correctly.