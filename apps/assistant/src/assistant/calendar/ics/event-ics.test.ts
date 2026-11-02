import { describe, expect, it } from "vitest";
import { buildEventIcs, type EventTiming } from "./build-event-ics.ts";
import { editEventIcs, IcsEditError } from "./edit-event-ics.ts";
import { parseLocalTime } from "./instant-of.ts";
import { readIcsEvents } from "./read-ics-events.ts";

const NOW = new Date("2026-11-01T10:00:00Z");

function timed(
  start: string,
  end: string,
  timeZone: string,
  endTimeZone = timeZone,
): EventTiming {
  return {
    allDay: false,
    start: parseLocalTime(start),
    end: parseLocalTime(end),
    timeZone,
    endTimeZone,
  };
}

function ics(timing: EventTiming, title = "Dentist") {
  return buildEventIcs({
    uid: "uid-1@assistant.qingqi.dev",
    title,
    timing,
    location: "12 High St, London",
    description: "Ref ABC123",
    url: "message://%3Ca%40b%3E",
    sourceMessageId: "<a@b>",
    alarms: ["-PT1H"],
    now: NOW,
  });
}

function unfolded(text: string) {
  return text.replace(/\r\n /g, "").split("\r\n");
}

describe("event ICS", () => {
  it("writes a timed event in its zone with a VTIMEZONE of the zone's clock changes, and reads the same times back", () => {
    const text = ics(
      timed("2026-11-05T14:30", "2026-11-05T15:30", "Europe/London"),
    );
    const lines = unfolded(text);
    expect(lines).toEqual(
      expect.arrayContaining([
        "DTSTART;TZID=Europe/London:20261105T143000",
        "DTEND;TZID=Europe/London:20261105T153000",
        "TRIGGER:-PT1H",
      ]),
    );
    expect(lines.join("\n")).toContain(
      [
        "BEGIN:DAYLIGHT",
        "DTSTART:20260329T010000",
        "TZOFFSETFROM:+0000",
        "TZOFFSETTO:+0100",
        "END:DAYLIGHT",
      ].join("\n"),
    );
    expect(readIcsEvents(text, "Asia/Tokyo")).toEqual([
      expect.objectContaining({
        title: "Dentist",
        location: "12 High St, London",
        description: "Ref ABC123",
        allDay: false,
        start: Date.parse("2026-11-05T14:30:00Z"),
        startLocal: "2026-11-05T14:30",
        endLocal: "2026-11-05T15:30",
        timeZone: "Europe/London",
        endTimeZone: "Europe/London",
        recurring: false,
        hasAttendees: false,
      }),
    ]);
  });

  it("gives a flight its arrival in the arrival zone", () => {
    const text = ics(
      timed(
        "2026-12-20T09:15",
        "2026-12-20T12:05",
        "Europe/London",
        "America/New_York",
      ),
      "Flight BA117 London → New York",
    );
    expect(unfolded(text)).toEqual(
      expect.arrayContaining([
        "DTSTART;TZID=Europe/London:20261220T091500",
        "DTEND;TZID=America/New_York:20261220T120500",
        "TZID:Europe/London",
        "TZID:America/New_York",
      ]),
    );
    const [event] = readIcsEvents(text, "UTC");
    expect(event).toMatchObject({
      title: "Flight BA117 London → New York",
      start: Date.parse("2026-12-20T09:15:00Z"),
      end: Date.parse("2026-12-20T17:05:00Z"),
      endLocal: "2026-12-20T12:05",
      endTimeZone: "America/New_York",
    });
  });

  it("writes an all-day event as dates, with the day after the last day as its end, and reads the last day back", () => {
    const text = ics({
      allDay: true,
      startDate: parseLocalTime("2026-11-05"),
      endDate: parseLocalTime("2026-11-08"),
    });
    expect(unfolded(text)).toEqual(
      expect.arrayContaining([
        "DTSTART;VALUE=DATE:20261105",
        "DTEND;VALUE=DATE:20261108",
      ]),
    );
    expect(text).not.toContain("VTIMEZONE");
    expect(readIcsEvents(text, "Europe/London")[0]).toMatchObject({
      allDay: true,
      startLocal: "2026-11-05",
      endLocal: "2026-11-07",
      timeZone: null,
    });
  });

  it("escapes text and folds long lines so that a reader gets the title back", () => {
    const title = `Dinner; with Ann, Bob and "Cy" \\ 晚餐 ${"long ".repeat(20)}`;
    const text = ics(
      timed("2026-07-01T19:00", "2026-07-01T21:00", "Europe/Paris"),
      title,
    );
    expect(
      text
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    const [event] = readIcsEvents(text, "UTC");
    expect(event.title).toBe(title);
    expect(event.start).toBe(Date.parse("2026-07-01T17:00:00Z"));
  });
});

const OWNER_EVENT = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Apple Inc.//macOS 15//EN",
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Paris",
  "BEGIN:STANDARD",
  "DTSTART:19701025T030000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "END:STANDARD",
  "END:VTIMEZONE",
  "BEGIN:VEVENT",
  "UID:owner-1",
  "DTSTAMP:20260101T000000Z",
  "SEQUENCE:3",
  "DTSTART;TZID=Europe/Paris:20261210T100000",
  "DURATION:PT2H",
  "SUMMARY:Hotel Lutetia check-in",
  "DESCRIPTION:Bring passport",
  "X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC",
  "BEGIN:VALARM",
  "ACTION:DISPLAY",
  "TRIGGER:-PT15M",
  "END:VALARM",
  "END:VEVENT",
  "END:VCALENDAR",
  "",
].join("\r\n");

describe("editEventIcs", () => {
  it("changes the times and zone and keeps every other line of the owner's event", () => {
    const text = editEventIcs(OWNER_EVENT, {
      timing: timed("2026-12-11T15:00", "2026-12-11T16:00", "Asia/Tokyo"),
      now: NOW,
    });
    const lines = unfolded(text);
    expect(lines).toEqual(
      expect.arrayContaining([
        "UID:owner-1",
        "SEQUENCE:4",
        "DTSTAMP:20261101T100000Z",
        "DTSTART;TZID=Asia/Tokyo:20261211T150000",
        "DTEND;TZID=Asia/Tokyo:20261211T160000",
        "SUMMARY:Hotel Lutetia check-in",
        "DESCRIPTION:Bring passport",
        "X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC",
        "TRIGGER:-PT15M",
        "TZID:Asia/Tokyo",
      ]),
    );
    expect(lines.some((line) => line.startsWith("DURATION"))).toBe(false);
    expect(text).not.toContain("Europe/Paris");
    expect(readIcsEvents(text, "UTC")).toEqual([
      expect.objectContaining({
        start: Date.parse("2026-12-11T06:00:00Z"),
        end: Date.parse("2026-12-11T07:00:00Z"),
        timeZone: "Asia/Tokyo",
      }),
    ]);
  });

  it("changes only the title and keeps the zone it had", () => {
    const text = editEventIcs(OWNER_EVENT, { title: "Check-in", now: NOW });
    const [event] = readIcsEvents(text, "UTC");
    expect(event).toMatchObject({
      title: "Check-in",
      start: Date.parse("2026-12-10T09:00:00Z"),
      end: Date.parse("2026-12-10T11:00:00Z"),
    });
    expect(text).toContain("TZID:Europe/Paris");
  });

  it("refuses an object with more than one event", () => {
    const two = OWNER_EVENT.replace(
      "END:VEVENT",
      "END:VEVENT\r\nBEGIN:VEVENT\r\nUID:owner-1\r\nRECURRENCE-ID:20261217T100000\r\nDTSTART:20261217T100000Z\r\nEND:VEVENT",
    );
    expect(() => editEventIcs(two, { title: "x", now: NOW })).toThrow(
      IcsEditError,
    );
  });
});
