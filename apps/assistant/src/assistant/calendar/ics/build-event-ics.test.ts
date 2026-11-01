import { describe, expect, it } from "vitest";
import type { MailEvent } from "#src/assistant/classify/types.ts";
import { buildEventIcs } from "./build-event-ics.ts";
import { entryOfEvent } from "./entry-of-event.ts";
import { readIcsEvents } from "./read-ics-events.ts";

const NOW = new Date("2026-11-01T10:00:00Z");

function event(overrides: Partial<MailEvent>): MailEvent {
  return {
    kind: "appointment",
    change: "new",
    title: "Dentist",
    start: "2026-11-05T14:30",
    end: null,
    allDay: false,
    timeZone: "Europe/London",
    location: null,
    certainty: "sure",
    ...overrides,
  };
}

function ics(mailEvent: MailEvent, locale: "en" | "zh" = "en") {
  return buildEventIcs({
    uid: "uid-1@assistant.qingqi.dev",
    sequence: 0,
    entry: entryOfEvent(mailEvent, locale),
    description: "Check-up with Dr Lee\n\nOpen the mail: message://%3Ca%40b%3E",
    url: "message://%3Ca%40b%3E",
    now: NOW,
  });
}

function unfoldedLines(text: string) {
  return text.replace(/\r\n /g, "").split("\r\n");
}

function triggers(text: string) {
  return unfoldedLines(text).filter((line) => line.startsWith("TRIGGER:"));
}

/** The lines of the VEVENT, without its alarms. */
function eventLines(text: string) {
  const lines = unfoldedLines(text);
  return lines.slice(
    lines.indexOf("BEGIN:VEVENT"),
    lines.indexOf("BEGIN:VALARM"),
  );
}

describe("buildEventIcs", () => {
  it("writes a timed event in its zone with a VTIMEZONE of the zone's clock changes, and alarms 1 h, 30 min and 10 min before", () => {
    const text = ics(event({}));
    expect(eventLines(text)).toEqual(
      expect.arrayContaining([
        "DTSTART;TZID=Europe/London:20261105T143000",
        "DTEND;TZID=Europe/London:20261105T153000",
        "SUMMARY:Dentist",
      ]),
    );
    const lines = unfoldedLines(text);
    const zone = lines.slice(
      lines.indexOf("BEGIN:VTIMEZONE"),
      lines.indexOf("END:VTIMEZONE") + 1,
    );
    expect(zone).toContain("TZID:Europe/London");
    expect(zone.join("\n")).toContain(
      [
        "BEGIN:DAYLIGHT",
        "DTSTART:20260329T010000",
        "TZOFFSETFROM:+0000",
        "TZOFFSETTO:+0100",
        "END:DAYLIGHT",
        "BEGIN:STANDARD",
        "DTSTART:20261025T020000",
        "TZOFFSETFROM:+0100",
        "TZOFFSETTO:+0000",
        "END:STANDARD",
      ].join("\n"),
    );
    expect(triggers(text)).toEqual([
      "TRIGGER:-PT1H",
      "TRIGGER:-PT30M",
      "TRIGGER:-PT10M",
    ]);
  });

  it("gives travel alarms 3 h, 1 h and 30 min before, and keeps the end the mail gave", () => {
    const text = ics(
      event({
        kind: "travel",
        title: "BA 117 to New York",
        start: "2026-12-20T09:15",
        end: "2026-12-20T12:05",
        timeZone: "America/New_York",
      }),
    );
    expect(eventLines(text)).toEqual(
      expect.arrayContaining([
        "DTSTART;TZID=America/New_York:20261220T091500",
        "DTEND;TZID=America/New_York:20261220T120500",
      ]),
    );
    expect(triggers(text)).toEqual([
      "TRIGGER:-PT3H",
      "TRIGGER:-PT1H",
      "TRIGGER:-PT30M",
    ]);
  });

  it("puts a deadline without a time at 09:00 local on its day as a to-do, with alarms the day before and at the start", () => {
    const text = ics(
      event({
        kind: "deadline",
        title: "交市政税",
        start: "2026-11-10",
        allDay: true,
        timeZone: "Asia/Shanghai",
      }),
      "zh",
    );
    expect(eventLines(text)).toEqual(
      expect.arrayContaining([
        "DTSTART;TZID=Asia/Shanghai:20261110T090000",
        "SUMMARY:待办：交市政税",
      ]),
    );
    expect(triggers(text)).toEqual(["TRIGGER:-P1D", "TRIGGER:PT0S"]);
    expect(text).toContain(
      "BEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0800\r\nTZOFFSETTO:+0800\r\nEND:STANDARD",
    );
  });

  it("writes an all-day event as dates, with the day after the last day as its end and no VTIMEZONE", () => {
    const text = ics(
      event({
        title: "Hotel Arts",
        start: "2026-11-05",
        end: "2026-11-07",
        allDay: true,
      }),
    );
    expect(eventLines(text)).toEqual(
      expect.arrayContaining([
        "DTSTART;VALUE=DATE:20261105",
        "DTEND;VALUE=DATE:20261108",
      ]),
    );
    expect(text).not.toContain("VTIMEZONE");
  });

  it("escapes text and folds long lines so that a reader gets the title and the instant back", () => {
    const title = `Dinner; with Ann, Bob and "Cy" \\ ${"long ".repeat(20)}`;
    const text = ics(
      event({ title, start: "2026-07-01T19:00", timeZone: "Europe/Paris" }),
    );
    expect(text.split("\r\n").every((line) => line.length <= 75)).toBe(true);
    const [read] = readIcsEvents(text, "UTC");
    expect(read.title).toBe(title);
    expect(new Date(read.start).toISOString()).toBe("2026-07-01T17:00:00.000Z");
  });
});
