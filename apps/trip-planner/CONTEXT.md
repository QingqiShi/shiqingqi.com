# Trip Planner

A private, password-gated, Chinese-only PWA for reading a pre-written road-trip itinerary day by day. Despite the name it is a reader, not an authoring tool — trips are hard-coded TypeScript modules compiled into the bundle.

Deliberately isolated from the rest of the monorepo: shadcn/ui on Tailwind rather than `@tuja/ui`, no i18n pipeline, its own Vercel project. Its words are its own — see `CONTEXT-MAP.md` for the ones that are false friends elsewhere.

## Language

**Trip**:
One whole journey, unlocked by its own password and addressed by its slug. ZH: 行程.
_Avoid_: 旅行计划, 旅程, 旅途

**Day**:
One calendar day of a Trip, carrying everything scheduled for it.

**Day feed**:
The single chronological stream a Day's parallel arrays are merged into — events, navigation, tips, dining, places, checklists, sign sheets, flights. The app's central construction.
_Avoid_: 行程 (that word is the Trip)

**Day moment**:
One time bucket within the Day feed. Items with no clock time sort to the end.

**Anchor**:
A must-be-there commitment on a Day — the thing that answers "where do I have to be". Distinct from a timeline event, and the target of the feed's jump-to links.

**Leg**:
One navigable hop between two points, with its own travel mode and optional waypoints.
_Avoid_: hop, segment (a segment is a URL path segment)

**Place**:
Somewhere worth going. **Waypoint** is an intermediate stop inside a Leg; neither is a "point".
_Avoid_: stop, destination (in our own code — the Maps API's `destination` is imposed), point

**Restaurant**:
Somewhere to eat, with its own booking status.

**Lodging**:
The accommodation itself. A **Stay** is one night in one Lodging — the two are not interchangeable.

**Tier**:
A Place's rung on the fallback ladder: 首选 (first choice), 备选 (fallback), 兜底 (last resort).
_Avoid_: plan, plan A/B/C

**Tip**:
A practical heads-up attached to a Day or to one item on it.

**Party**:
Everyone on the Trip. One traveller's whole itinerary is a **person schedule**; their involvement on one Day is a **presence** — arriving, departing, heading home, or simply present.
_Avoid_: cast, guest, people (as the concept)

**Sign sheet**:
A crib sheet of foreign road signs drawn as inline pictographs.

**Trip gate**:
The per-Trip password wall. Each Trip has its own **realm**, a salt so two Trips sharing a password cannot cross-unlock.

**Checklist**:
A tickable list attached to a Day, persisted per Trip in the browser.

**Booked**:
A reservation that is confirmed. ZH: 已预订, everywhere — cards, overview rows, and trip data alike.
_Avoid_: 已订

## Frozen contracts

Two of these are documented in-source as deliberately legacy — do not tidy them.

- Cookies `trip_gate` and `trip_gate_tuscany`; realms `trip` and `trip-tuscany`. The `gb` Trip keeps its pre-multi-trip names so old unlocks survive.
- localStorage `{slug}-trip-checklist`, keyed by `D{dayN}·{title}·{index}` — renaming a checklist title or reordering its items silently loses ticks.
- Token derivation `SHA-256("{realm}:{password}")`, 90-day cookie lifetime
- URL shapes `/`, `/{slug}`, `/unlock/{slug}`, `/~offline`, and the proxy's route matcher
- DOM ids `d{dayN}-moment-{minutes}`; the `trip-weather-v2` cache key
- Env vars `SITE_PASSWORD_GB`, `SITE_PASSWORD_TUSCANY`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`
- Every union literal in `src/data/types.ts` — renaming one is a data migration across ~3,800 lines of trip content
- Open-Meteo and Google Maps Embed request shapes
