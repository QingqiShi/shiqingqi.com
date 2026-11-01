import { describe, expect, it } from "vitest";
import type { MailEvent } from "#src/assistant/classify/types.ts";
import { entryOfEvent, spanOfEntry } from "./ics/entry-of-event.ts";
import type { IcsEvent } from "./ics/read-ics-events.ts";
import { isDuplicate, planCalendarWrite } from "./plan-calendar-write.ts";

const NOW = new Date("2026-11-01T10:00:00Z");
const LATER = Date.parse("2026-11-05T15:30:00Z");

describe("planCalendarWrite", () => {
  it("makes an event for new mail, and changes the thread's event for a later new or changed mail", () => {
    const base = { endsAt: LATER, now: NOW };
    expect(
      planCalendarWrite({ ...base, change: "new", threadEvent: null }),
    ).toEqual({ action: "create" });
    expect(
      planCalendarWrite({
        ...base,
        change: "update",
        threadEvent: { id: "e1", cancelled: false },
      }),
    ).toEqual({ action: "update", eventId: "e1" });
    expect(
      planCalendarWrite({
        ...base,
        change: "new",
        threadEvent: { id: "e1", cancelled: false },
      }),
    ).toEqual({ action: "update", eventId: "e1" });
  });

  it("deletes the thread's event on a cancel, and does nothing when the thread has no live event", () => {
    const base = { change: "cancel" as const, endsAt: LATER, now: NOW };
    expect(
      planCalendarWrite({
        ...base,
        threadEvent: { id: "e1", cancelled: false },
      }),
    ).toEqual({ action: "delete", eventId: "e1" });
    expect(
      planCalendarWrite({
        ...base,
        threadEvent: { id: "e1", cancelled: true },
      }),
    ).toEqual({ action: "skip", result: "unmatched" });
  });

  it("makes a new event when a cancelled one is booked again, and nothing for an event that is over", () => {
    expect(
      planCalendarWrite({
        change: "update",
        endsAt: LATER,
        now: NOW,
        threadEvent: { id: "e1", cancelled: true },
      }),
    ).toEqual({ action: "create" });
    expect(
      planCalendarWrite({
        change: "new",
        endsAt: NOW.getTime(),
        now: NOW,
        threadEvent: null,
      }),
    ).toEqual({ action: "skip", result: "past" });
  });
});

function mailEvent(overrides: Partial<MailEvent>): MailEvent {
  return {
    kind: "appointment",
    change: "new",
    title: "Dentist check-up",
    start: "2026-11-05T14:30",
    end: null,
    allDay: false,
    timeZone: "Europe/London",
    location: null,
    certainty: "sure",
    ...overrides,
  };
}

function other(overrides: Partial<IcsEvent>): IcsEvent {
  return {
    uid: "other",
    title: "Dentist",
    start: Date.parse("2026-11-05T14:30:00Z"),
    end: null,
    allDay: false,
    startDate: null,
    ...overrides,
  };
}

function duplicate(event: MailEvent, existing: IcsEvent) {
  const entry = entryOfEvent(event, "en");
  return isDuplicate(
    entry,
    spanOfEntry(entry.timing).start,
    existing,
    "Europe/London",
  );
}

describe("isDuplicate", () => {
  it("finds a timed event at the same time with a matching title, such as an accepted invitation", () => {
    expect(duplicate(mailEvent({}), other({}))).toBe(true);
    expect(
      duplicate(
        mailEvent({ title: "牙医复诊" }),
        other({ title: "复诊（牙医）" }),
      ),
    ).toBe(true);
  });

  it("keeps an event whose time or title differs", () => {
    expect(
      duplicate(
        mailEvent({}),
        other({ start: Date.parse("2026-11-05T15:30:00Z") }),
      ),
    ).toBe(false);
    expect(duplicate(mailEvent({}), other({ title: "Team meeting" }))).toBe(
      false,
    );
  });

  it("compares the day when either event is all-day", () => {
    expect(
      duplicate(
        mailEvent({
          kind: "deadline",
          title: "Pay council tax",
          start: "2026-11-10",
          allDay: true,
        }),
        other({
          title: "Council tax due",
          allDay: true,
          startDate: "2026-11-10",
          start: Date.parse("2026-11-10T00:00:00Z"),
        }),
      ),
    ).toBe(true);
    expect(
      duplicate(
        mailEvent({ title: "Hotel Arts", start: "2026-11-05", allDay: true }),
        other({
          title: "Hotel Arts check-in",
          start: Date.parse("2026-11-06T15:00:00Z"),
        }),
      ),
    ).toBe(false);
  });
});
