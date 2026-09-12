# Trip Planner

A private, password-gated, Chinese-only PWA for reading a pre-written road-trip itinerary day by day: a reader, not an authoring tool, since trips are hard-coded TypeScript modules compiled into the bundle. It is deliberately isolated from the rest of the monorepo — shadcn/ui on Tailwind rather than `@tuja/ui`, no i18n pipeline — so its words are its own.

## Language

**Trip**:
One whole journey, unlocked by its own password and addressed by its slug. ZH: 行程.
_Avoid_: 旅行计划, 旅程, 旅途

**Day feed**:
The single chronological stream a day's parallel arrays are merged into — events, navigation, tips, dining, places, checklists, sign sheets, flights. The app's central construction.
_Avoid_: 行程 (that word is the Trip)

**Anchor**:
A must-be-there commitment on a day — the thing that answers "where do I have to be". Distinct from a timeline event, and the target of the feed's jump-to links.

**Leg**:
One navigable hop between two points, with its own travel mode and optional waypoints.
_Avoid_: hop, segment (a segment is a URL path segment)

**Place**:
Somewhere worth going. **Waypoint** is an intermediate stop inside a Leg; neither is a "point".
_Avoid_: stop, destination (in our own code — the Maps API's `destination` is imposed), point

**Accommodation**:
Where the Party sleeps. A **Stay** is one night in one Accommodation — the two are not interchangeable.
_Avoid_: lodging

**Tier**:
A Place's rung on the fallback ladder: 首选 (first choice), 备选 (fallback), 兜底 (last resort).
_Avoid_: plan, plan A/B/C

**Party**:
Everyone on the Trip. One traveller's whole itinerary is a **person schedule**; their involvement on one day is a **presence** — arriving, departing, heading home, or simply present.
_Avoid_: cast, guest, people (as the concept)
