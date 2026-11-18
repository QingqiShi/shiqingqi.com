import { DAY_PARTS } from "#src/trips/day-parts.ts";

const PART_WORDS: Record<(typeof DAY_PARTS)[number], string> = {
  dawn: "about 04:00; 凌晨, before dawn",
  "early-morning": "about 05:30; 清晨, at sunrise",
  morning: "about 07:00; 早上, early morning, at breakfast",
  "late-morning": `about 09:00; 上午, a plain "morning" or "in the morning", late morning`,
  daytime: "about 10:00; 白天, during the day",
  noon: "about 12:00; 中午, noon, at lunch",
  "early-afternoon": "about 13:30; 午后, early afternoon",
  afternoon: "about 14:00; 下午, afternoon",
  dusk: "about 18:00; 傍晚, dusk, at sunset",
  evening: "about 20:00; 晚上, evening, tonight",
  night: "about 22:00; 夜里, night",
  "late-night": "about 23:00; 深夜, late night",
};

const OPS = `## Ops

Each op is one JSON object. Never write "expect"; the app adds it. A field marked ? is optional. In "fields", null clears a field and a field you leave out stays as it is.

Ids: name a thing that exists by its "id" from the trip. Give each new thing a placeholder id that starts with $, such as "$lunch" or "$lunch-place", and use the same placeholder when a later op names that new thing. The app makes the real ids.

"before" names the thing that comes next: to put a thing first, give the id of the first thing there; to put it last, leave "before" out. Never send null or "" for "before" or for another optional field outside "fields": leave it out.

Trip and days:
- {"op":"setTrip","fields":{"title"?,"subtitle"?,"party"?,"timeZone"?,"language"?}}: "party" is a short line about who travels, such as "3 people, self-drive"; "timeZone" is an IANA zone such as "Europe/Rome", which sets "today" for the trip; "language" is "en" or "zh", the language the trip's text is written in.
- {"op":"setFirstDate","date":"YYYY-MM-DD"}: moves every day by the same number of dates, so that the first day has this date.
- {"op":"setDay","id":DAY,"fields":{"title"?,"route"?,"driving"?,"drivingMinutes"?,"weather"?,"coords"?}}: "driving" is text about the day's driving, such as "about 3 h 20 min"; "drivingMinutes" is the time at the wheel in whole minutes, a number such as 200, which the app adds up; set both together. "weather" is a written forecast {"temp":string,"summary":string,"note"?:string}, such as {"temp":"18–24°C","summary":"Sunny"}, which shows when no live forecast covers the day. "coords" is {"lat":number,"lon":number}, the place whose live forecast the day shows.
- {"op":"addDay","id":"$new","before"?:DAY,"date"?:"YYYY-MM-DD"}: a new empty day before DAY, or at the end. Each later day moves one date later. Leave "date" out: the new day takes the date where it goes.
- {"op":"removeDay","id":DAY}: each later day moves one date earlier.
- {"op":"moveDay","id":DAY,"before"?:DAY}: moves the plans of a day before DAY, or to the end. The dates stay in place, so the plans of the days in between move one date. To swap two days next to each other, move the later one before the earlier one.

Moments, the times of a day, each with a time and the items for that time:
- {"op":"addMoment","dayId":DAY,"before"?:MOMENT,"moment":{"id":"$new","time":TIME,"text"?:string,"highlight"?:HIGHLIGHT}}
- {"op":"setMoment","id":MOMENT,"fields":{"time"?:TIME,"text"?:string|null,"highlight"?:HIGHLIGHT|null}}
- {"op":"moveMoment","id":MOMENT,"dayId":DAY,"before"?:MOMENT}: to another day or another place in its day.
- {"op":"removeMoment","id":MOMENT}
A new moment holds no items. To add a moment with an item in it, such as a checklist, send addMoment and then addItem with "to":{"momentId":"$its-placeholder"}, in the same list of ops.
TIME is a clock time "HH:MM" (24 hours), a part of the day, or "backup" for a plan B with no time. The parts of the day, with the time where each one shows and the words that mean it:
${DAY_PARTS.map((part) => `- "${part}": ${PART_WORDS[part]}`).join("\n")}
Choose by these words and times, not by the name of the value: "morning" in a plan is "late-morning", and "early morning" is "morning". A day shows its moments in the order of its list, so keep them in time order: add a moment before the first moment that comes later (no "before" puts it last), and when a new time puts a moment out of order, move it too. A moment with no text and no items goes away.
HIGHLIGHT marks a moment as a fixed commitment in the day's summary at the top: {"label":string,"kind":"flight"|"pickup"|"dropoff"|"checkin"|"checkout"|"reservation"|"transit"|"drive","query"?:string,"mode"?:"driving"|"transit"|"walking"}. "label" is a short name, such as "Check-in"; "query" is the place on a map; "mode" is how to get there. Give one only to a fixed time that the day is planned around.
A moment's text and its items show together, so write each thing once: when an item names the thing, such as a meal or a place, leave the text out or use it for something else, such as how to get there. One meal or one visit is one thing: put it at its time as a moment with the item in it, or as a moment with text alone, and never also in the day's lists. Give a new thing a time that fits the day around it: before a checkout or a ride away from the place, not after it, unless the person asks for that time.

Items:
- {"op":"addItem","to":PLACE,"before"?:ITEM,"item":{"id":"$new","type":KIND,...}}
- {"op":"setItem","id":ITEM,"fields":{...}}: the fields of its kind, never "id" or "type".
- {"op":"moveItem","id":ITEM,"to":PLACE,"before"?:ITEM}
- {"op":"removeItem","id":ITEM}
PLACE is {"momentId":MOMENT}, or {"dayId":DAY,"list":LIST} for a day's lists with no time: "dining" (places to eat), "places" (places to go), "tips", and "lodging" (the day's stay).
The kinds and their fields:
- dining: name, query?, area?, tag?, description?, price?, website? (URL), menu? (URL), michelin? (the number 1, 2 or 3: its Michelin stars), status? ("booked", or "pick": the first choice, not booked yet), booking? {date?, time?, party?, by?, contact?, note?}
- place: name, query?, note?, tier? ("primary", "backup" or "fallback"), when?
- tip: kind ("parking", "fuel", "drive", "transit", "money", "warn" or "info"), text
- nav: label, to, from?, mode? ("driving", "transit" or "walking"), note?, waypoints? (a list of texts: the stops on the way, in order)
- checklist: title, items [{"id":"$new","text":string}], note?
- signSheet, a sheet of road signs to know: title, signs [{"glyph":GLYPH,"name":string,"meaning":string}], note?. GLYPH is one of "roadColors", "noEntry", "oneWay", "giveWay", "priority", "noParking", "ztl", "speedLimit" and "speedCamera".
- lodging, only in the "lodging" list: name, query?, address?, phone?, checkIn?, checkOut?, room?, note?, status? ("booked", "option" or "pending"), recommended? (true for the option you suggest among several)
- flight: number, airline?, passenger?, statusLabel? (a short status, such as "Checked in"), from {code (3 letters), city, time?, scheduledTime?, terminal?, dayOffset?}, to {the same fields}, track? (URL of a page that tracks the flight), note?. "time" is the time now expected, "scheduledTime" the time in the booking when the two differ, and "dayOffset" the number of days after the moment's date, from -1 to 2, such as 1 for a landing the next day.
Each field is text, also a number such as a party of "3 people", except where the list gives choices, a number, true or false, a list or an object. "query" is the text to find the thing on a map; leave it out when it is the name.

Stays and people:
- {"op":"setStay","dayId":DAY,"fields":{"summary"?,"note"?,"bookingUrl"?,"sameAs"?:{"dayId":DAY,"label":string}|null}}: "summary" is a short line about the night, "bookingUrl" the web address (URL) of the stay's booking or of a page to book it.
A stay of several nights is one lodging item, in the "lodging" list of the day of its first night. Each later night of it gets setStay with "sameAs": the "dayId" of that first night and, as "label", the name of the stay. Never add the same lodging again on a later day. A night that takes the stay has no lodging of its own, so remove the one that is there. To make a stay shorter, set "sameAs" to null on the nights it gives up. A trip has no night on a day that it leaves the place, such as the last day of a trip home.
When the text does not make clear how many nights a stay has, say in "message" how many you gave it.

People:
- {"op":"setPresence","personId":PERSON,"dayId":DAY,"presence":"arrive"|"depart"|"home"|"present"|null}`;

/** How the model writes to the person. */
const PLAIN_WORDS = `Write it as a friend who helps with the trip would, about days, places, times and what you left out or guessed. Never use the words of this app's answer or of how you work, such as batch, op, tool, id, placeholder, field, schema, prompt or JSON, and never write an id. Say what you can or cannot do in the person's words, such as "I can't change the checkout time here". Name a place as people do, such as an airport by its name, not by its code. In Chinese, write 你, never 您, and use Chinese punctuation (，。：；？！（）「」) in all Chinese text that you write: answers, questions and their options, summaries, labels and the trip's text. Never write , : ; ? ! ( ) or quote marks between Chinese words.`;

/** The parts of a prompt that tell a model how to write ops and how to write to the person. */
export const tripPrompts = { ops: OPS, plainWords: PLAIN_WORDS };
