import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CalendarRequestError } from "#src/assistant/calendar/caldav/calendar-request-error.ts";
import type {
  CalendarObject,
  CalendarSession,
} from "#src/assistant/calendar/caldav/types.ts";
import {
  ASSISTANT_UID_DOMAIN,
  buildEventIcs,
  spanOfTiming,
  type EventTiming,
} from "#src/assistant/calendar/ics/build-event-ics.ts";
import {
  editEventIcs,
  IcsEditError,
  type EventEdit,
} from "#src/assistant/calendar/ics/edit-event-ics.ts";
import { eventsInRange } from "#src/assistant/calendar/ics/events-in-range.ts";
import {
  addDays,
  addMinutes,
  formatLocalTime,
  instantOf,
  isLocalTimeText,
  isTimeZone,
  parseLocalTime,
} from "#src/assistant/calendar/ics/instant-of.ts";
import {
  readIcsEvents,
  type IcsEvent,
} from "#src/assistant/calendar/ics/read-ics-events.ts";
import type { AgentActionKind } from "#src/assistant/db/schema.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import type { EventHandles, EventRef } from "./event-handles.ts";
import type { RunCalendar, RunCalendars } from "./run-calendars.ts";

/** The limits of one run. A call over a limit is refused. */
export const CALENDAR_TOOL_LIMITS = {
  creates: 20,
  updates: 20,
  deletes: 10,
  listDays: 400,
  listResults: 100,
  /** How far ahead a new event may start. */
  futureDays: 730,
};

export type CalendarToolLimits = typeof CALENDAR_TOOL_LIMITS;

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60_000;
/** Two events whose titles match and whose starts are this close are the same event. */
const SAME_START_MS = 5 * MINUTE;
const DEFAULT_MINUTES = 60;
/** 1 h, 30 min and 10 min before a timed event; 09:00 on the day before an all-day one. */
const DEFAULT_TIMED_ALARMS = [60, 30, 10];
const DEFAULT_ALL_DAY_ALARMS = [15 * 60];
const MAX_REASON_CHARS = 300;

export interface CalendarToolStats {
  createdEvents: number;
  updatedEvents: number;
  deletedEvents: number;
}

/** The mail an event came from, for the action log and a link in the event. */
export interface SourceMail {
  /** In angle brackets. */
  messageId: string;
  subject: string;
  sender: string;
  /** Opens the mail, such as a `message:` link; null when there is none. */
  href: string | null;
}

export interface CalendarToolsInput {
  limits?: CalendarToolLimits;
  calendars: RunCalendars;
  handles: EventHandles;
  /** The owner's zone: for dates without a zone, and to show UTC times. */
  timeZone: string;
  /** The mail of a run id such as `m12`; a refusal for an id the run does not know. */
  sourceMail?: (id: string) => SourceMail;
  run: AgentRunContext;
  now: () => Date;
}

const calendarKey = z
  .string()
  .describe('A calendar key from list_calendars, such as "c1".');
const eventId = z
  .string()
  .describe('An event id from list_events or create_event, such as "e3".');
const reason = z
  .string()
  .trim()
  .min(1)
  .max(MAX_REASON_CHARS)
  .describe("Why, in one short line the owner will read in the activity log.");
const fromMail = z
  .string()
  .optional()
  .describe('The id of the mail the event comes from, such as "m12".');
const timeFields = {
  start: z
    .string()
    .describe(
      "Local time at the place, YYYY-MM-DDTHH:mm; for an all-day event, the first day, YYYY-MM-DD.",
    ),
  end: z
    .string()
    .optional()
    .describe(
      "In the same form. For an all-day event, the last day. Default: an hour after the start, or the start day.",
    ),
  allDay: z.boolean(),
  timeZone: z
    .string()
    .optional()
    .describe(
      "The IANA zone of the start, such as Europe/London. Default: the owner's zone.",
    ),
  endTimeZone: z
    .string()
    .optional()
    .describe(
      "The IANA zone of the end when it is not that of the start, such as the zone of the arrival airport.",
    ),
};
const detailFields = {
  location: z.string().max(200).optional(),
  notes: z
    .string()
    .max(1000)
    .optional()
    .describe("Short notes, such as the booking reference, seat or gate."),
  alarmMinutes: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(28 * 24 * 60),
    )
    .max(4)
    .optional()
    .describe(
      "Alarms, in minutes before the start. Default: 60, 30 and 10 for a timed event; 900 (09:00 the day before) for an all-day one.",
    ),
};

type TimeInput = {
  start: string;
  end?: string;
  allDay: boolean;
  timeZone?: string;
  endTimeZone?: string;
};

function zoneOf(value: string | undefined, fallback: string) {
  if (value === undefined) return fallback;
  if (!isTimeZone(value)) {
    throw new ToolRefusal(
      `"${value}" is not an IANA time zone, such as Europe/London.`,
    );
  }
  return value;
}

/** The timing of the input; a refusal for a time that cannot be read or an end before the start. */
function timingOf(input: TimeInput, ownerZone: string): EventTiming {
  const form = input.allDay ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm";
  for (const value of [input.start, input.end]) {
    if (value !== undefined && !isLocalTimeText(value, !input.allDay)) {
      throw new ToolRefusal(`"${value}" is not a time in the form ${form}.`);
    }
  }
  const start = parseLocalTime(input.start);
  if (input.allDay) {
    const last = input.end ? parseLocalTime(input.end) : start;
    const endDate = addDays(last, 1);
    if (instantOf(endDate, "UTC") <= instantOf(start, "UTC")) {
      throw new ToolRefusal("The last day is before the first day.");
    }
    return { allDay: true, startDate: start, endDate };
  }
  const timeZone = zoneOf(input.timeZone, ownerZone);
  const endTimeZone = zoneOf(input.endTimeZone, timeZone);
  const end = input.end
    ? parseLocalTime(input.end)
    : addMinutes(start, DEFAULT_MINUTES);
  const timing: EventTiming = {
    allDay: false,
    start,
    end,
    timeZone,
    endTimeZone,
  };
  const span = spanOfTiming(timing);
  if (span.end <= span.start) {
    throw new ToolRefusal("The end is not after the start.");
  }
  return timing;
}

function hasTimeChange(input: Partial<TimeInput>) {
  return (
    input.start !== undefined ||
    input.end !== undefined ||
    input.allDay !== undefined ||
    input.timeZone !== undefined ||
    input.endTimeZone !== undefined
  );
}

function triggersOf(minutes: readonly number[]) {
  return [...new Set(minutes)]
    .sort((a, b) => b - a)
    .map((value) => (value === 0 ? "PT0S" : `-PT${String(value)}M`));
}

function normalTitle(title: string) {
  return title.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

function hasSameTitleAndStart(
  timing: EventTiming,
  title: string,
  other: IcsEvent,
) {
  if (normalTitle(other.title) !== normalTitle(title)) return false;
  if (timing.allDay) {
    const date = instantOf(timing.startDate, "UTC");
    return other.allDay && other.start === date;
  }
  const start = instantOf(timing.start, timing.timeZone);
  return !other.allDay && Math.abs(other.start - start) <= SAME_START_MS;
}

/** When an event happens, in the days of an all-day event or the instants and local start day of a timed one. */
type Occasion =
  | { allDay: true; firstDay: string; lastDay: string }
  | { allDay: false; start: number; end: number; day: string };

function occasionOfTiming(timing: EventTiming): Occasion {
  if (timing.allDay) {
    return {
      allDay: true,
      firstDay: formatLocalTime(timing.startDate, false),
      lastDay: formatLocalTime(addDays(timing.endDate, -1), false),
    };
  }
  const span = spanOfTiming(timing);
  return {
    allDay: false,
    ...span,
    day: formatLocalTime(timing.start, false),
  };
}

function occasionOfEvent(event: IcsEvent): Occasion {
  const firstDay = event.startLocal.slice(0, 10);
  if (event.allDay) {
    return {
      allDay: true,
      firstDay,
      lastDay: event.endLocal ?? firstDay,
    };
  }
  return {
    allDay: false,
    start: event.start,
    end: Math.max(event.end ?? event.start, event.start + MINUTE),
    day: firstDay,
  };
}

/**
 * Timed events that overlap, all-day events that share a day, or a timed
 * event on the day of a one-day event, such as a deadline. A stay of some
 * days and a flight on its first day are not at the same time.
 */
function atSameTime(a: Occasion, b: Occasion): boolean {
  if (a.allDay && b.allDay) {
    return a.firstDay <= b.lastDay && b.firstDay <= a.lastDay;
  }
  if (!a.allDay && !b.allDay) return a.start < b.end && b.start < a.end;
  const day = a.allDay ? a : b;
  const timed = a.allDay ? b : a;
  return (
    day.allDay &&
    !timed.allDay &&
    day.firstDay === day.lastDay &&
    timed.day === day.firstDay
  );
}

/**
 * The same event said again: the same title at the same start, or another
 * event from the same mail at the same time, such as one deadline under two
 * titles.
 */
function isSameEvent(
  timing: EventTiming,
  title: string,
  sourceMessageId: string | null,
  other: IcsEvent,
) {
  if (hasSameTitleAndStart(timing, title, other)) return true;
  return (
    sourceMessageId !== null &&
    other.sourceMessageId === sourceMessageId &&
    atSameTime(occasionOfTiming(timing), occasionOfEvent(other))
  );
}

function madeByAssistant(event: IcsEvent) {
  return event.uid?.endsWith(ASSISTANT_UID_DOMAIN) ?? false;
}

/**
 * What the model sees of an event, or of one occurrence of a repeating
 * event, with what the other events of its object add: never its notes,
 * which can hold text from other people.
 */
function eventView(
  id: string,
  calendar: RunCalendar,
  event: IcsEvent,
  events: IcsEvent[],
) {
  return {
    id,
    calendar: calendar.key,
    title: event.title,
    start: event.startLocal,
    end: event.endLocal,
    allDay: event.allDay,
    timeZone: event.timeZone,
    endTimeZone:
      event.endTimeZone !== event.timeZone ? event.endTimeZone : undefined,
    location: event.location,
    recurring: repeats(events),
    withAttendees: events.some((entry) => entry.hasAttendees),
    cancelled: event.cancelled,
    madeByAssistant: madeByAssistant(event),
  };
}

/** The events of one calendar object repeat, or it holds changed instances of a repeating event. */
function repeats(events: readonly IcsEvent[]) {
  return events.length > 1 || events.some((event) => event.recurring);
}

function matchesText(events: IcsEvent[], text: string) {
  const needle = text.toLowerCase();
  return events.some((event) =>
    [event.title, event.location, event.description].some((value) =>
      value?.toLowerCase().includes(needle),
    ),
  );
}

function isStale(error: unknown) {
  return error instanceof CalendarRequestError && error.status === 412;
}

/**
 * The calendar tools of an agent run. Every guardrail lives here, not in a
 * prompt: they act only on the user's own iCloud calendars, on calendars
 * the policy lets them write, and only on events this run listed or made,
 * in the version the run saw. They never change a repeating event or one
 * with attendees, which could send mail to other people, and never make an
 * event that is over or a second copy of one. Every write needs a reason
 * and goes to the action log, with the event's data from before an update
 * or a delete.
 */
export function createCalendarTools({
  limits = CALENDAR_TOOL_LIMITS,
  calendars,
  handles,
  timeZone,
  sourceMail,
  run,
  now,
}: CalendarToolsInput): { tools: AgentTools; stats: CalendarToolStats } {
  const stats: CalendarToolStats = {
    createdEvents: 0,
    updatedEvents: 0,
    deletedEvents: 0,
  };

  function source(id: string | undefined) {
    if (id === undefined) return null;
    if (!sourceMail) throw new ToolRefusal("This run has no mail ids.");
    return sourceMail(id);
  }

  /** Counts one write before it starts, so that calls in parallel cannot pass the limit. */
  async function counted<T>(
    counter: keyof CalendarToolStats,
    limit: number,
    task: () => Promise<T>,
  ): Promise<T> {
    if (stats[counter] >= limit) {
      throw new ToolRefusal(
        `This run has done ${String(limit)} of these, the most it may. Leave the rest for the next run.`,
      );
    }
    stats[counter] += 1;
    try {
      return await task();
    } catch (error) {
      stats[counter] -= 1;
      throw error;
    }
  }

  let creating: Promise<unknown> = Promise.resolve();

  /** Runs creates one after another, so that a create sees the events that the one before it made. */
  function oneCreateAtATime<T>(task: () => Promise<T>): Promise<T> {
    const run = creating.then(task);
    creating = run.catch(() => undefined);
    return run;
  }

  async function writable(key: string | undefined) {
    const calendar = key
      ? await calendars.calendar(key)
      : await calendars.defaultCalendar();
    if (!calendar.canWrite) {
      throw new ToolRefusal(
        `Calendar ${calendar.key} ("${calendar.name}") is not one the owner lets you change.`,
      );
    }
    return calendar;
  }

  /** The event as it is on the server now, if it is still the version the run saw and one the tools may change. */
  async function current(id: string) {
    const ref = handles.get(id);
    const calendar = await writable(ref.calendarKey);
    const session = await calendars.session(calendar);
    const object = await session.getEvent(ref.url);
    if (!object) {
      const why = "it is no longer in the calendar.";
      handles.forget(id, why);
      throw new ToolRefusal(`Event ${id}: ${why}`);
    }
    if (ref.etag !== null && object.etag !== ref.etag) {
      const why =
        "it changed since this run listed it. List the events again to see it as it is now.";
      handles.forget(id, why);
      throw new ToolRefusal(`Event ${id}: ${why}`);
    }
    const events = readIcsEvents(object.data, timeZone);
    if (events.length === 0) {
      throw new ToolRefusal(`Event ${id} has no event the tools can read.`);
    }
    if (repeats(events)) {
      throw new ToolRefusal(
        `Event ${id} repeats. The owner changes repeating events in the Calendar app.`,
      );
    }
    if (events[0].hasAttendees) {
      throw new ToolRefusal(
        `Event ${id} has attendees: a change could send them mail. The owner changes it in the Calendar app.`,
      );
    }
    return { ref, calendar, session, object, event: events[0] };
  }

  async function log(
    kind: AgentActionKind,
    calendar: RunCalendar,
    mail: SourceMail | null,
    why: string,
    detail: Record<string, unknown>,
  ) {
    await run.logAction({
      accountId: calendar.accountId,
      kind,
      messageId: mail?.messageId ?? null,
      subject: mail?.subject ?? null,
      sender: mail?.sender ?? null,
      detail: { calendarUrl: calendar.url, calendar: calendar.name, ...detail },
      reason: why,
    });
  }

  /** The id of an event, or of one occurrence of a repeating event. */
  function register(
    calendar: RunCalendar,
    object: CalendarObject,
    event: IcsEvent,
    events: IcsEvent[],
  ) {
    return handles.register({
      calendarKey: calendar.key,
      url: object.url,
      etag: object.etag,
      title: event.title,
      occurrence: repeats(events) ? event.start : undefined,
    });
  }

  /** An event in any calendar that is this one said again. */
  async function findSame(
    timing: EventTiming,
    title: string,
    sourceMessageId: string | null,
  ) {
    const span = spanOfTiming(timing);
    const range = {
      start: new Date(span.start - SAME_START_MS - MINUTE),
      end: new Date(span.end + SAME_START_MS + MINUTE),
    };
    for (const calendar of (await calendars.load()).calendars) {
      const session = await calendars.session(calendar);
      for (const object of await session.listEvents(calendar.url, range)) {
        const events = readIcsEvents(object.data, timeZone);
        const same = eventsInRange(events, {
          start: range.start.getTime(),
          end: range.end.getTime(),
        }).find((event) => isSameEvent(timing, title, sourceMessageId, event));
        if (same) {
          return eventView(
            register(calendar, object, same, events),
            calendar,
            same,
            events,
          );
        }
      }
    }
    return null;
  }

  async function etagAfterWrite(
    session: CalendarSession,
    url: string,
    etag: string | null,
  ) {
    return etag ?? (await session.getEvent(url))?.etag ?? null;
  }

  function previousOf(object: CalendarObject) {
    return { href: object.url, etag: object.etag, ics: object.data };
  }

  const tools: AgentTools = {
    list_calendars: agentTool({
      description:
        "The owner's iCloud calendars, each with the key the other tools take. canWrite is false for a calendar you may only read.",
      inputSchema: z.object({}),
      execute: async () => {
        const loaded = await calendars.load();
        return {
          calendars: loaded.calendars.map((calendar) => ({
            calendar: calendar.key,
            name: calendar.name,
            account: calendar.address,
            default: calendar.isDefault,
            shared: calendar.shared,
            canWrite: calendar.canWrite,
          })),
          unavailable: loaded.unavailable,
        };
      },
    }),

    list_events: agentTool({
      description: `Lists the events between two days, each with an id for the other tools; a repeating event comes once for each time it happens. text keeps only events whose title, location or notes hold it, such as a booking reference; the notes never come back. At most ${String(limits.listDays)} days per call.`,
      inputSchema: z.object({
        calendars: z
          .array(calendarKey)
          .min(1)
          .optional()
          .describe("Default: every calendar."),
        from: z.iso.date().describe("The first day, YYYY-MM-DD."),
        to: z.iso.date().describe("The last day, YYYY-MM-DD."),
        text: z.string().trim().min(2).max(100).optional(),
      }),
      execute: async (input) => {
        const start = instantOf(parseLocalTime(input.from), timeZone);
        const end = instantOf(addDays(parseLocalTime(input.to), 1), timeZone);
        if (end <= start) throw new ToolRefusal("to is before from.");
        if (end - start > limits.listDays * DAY + DAY) {
          throw new ToolRefusal(
            `List at most ${String(limits.listDays)} days at a time.`,
          );
        }
        const loaded = await calendars.load();
        const chosen = input.calendars
          ? await Promise.all(
              [...new Set(input.calendars)].map((key) =>
                calendars.calendar(key),
              ),
            )
          : loaded.calendars;
        const found: { start: number; view: ReturnType<typeof eventView> }[] =
          [];
        const failed: { calendar: string; error: string }[] = [];
        for (const calendar of chosen) {
          let objects: CalendarObject[];
          try {
            const session = await calendars.session(calendar);
            objects = await session.listEvents(calendar.url, {
              start: new Date(start),
              end: new Date(end),
            });
          } catch (error) {
            if (error instanceof ToolRefusal) throw error;
            failed.push({
              calendar: calendar.key,
              error: error instanceof Error ? error.message : String(error),
            });
            continue;
          }
          for (const object of objects) {
            const events = readIcsEvents(object.data, timeZone);
            if (input.text && !matchesText(events, input.text)) continue;
            for (const event of eventsInRange(events, { start, end })) {
              found.push({
                start: event.start,
                view: eventView(
                  register(calendar, object, event, events),
                  calendar,
                  event,
                  events,
                ),
              });
            }
          }
        }
        found.sort((a, b) => a.start - b.start);
        return {
          events: found.slice(0, limits.listResults).map(({ view }) => view),
          more: found.length > limits.listResults,
          failed,
        };
      },
    }),

    create_event: agentTool({
      description: `Puts a new event into the calendar that fits it, such as a work calendar for a work meeting; without calendar, into the default one. The people a shared calendar is shared with see its events. It refuses an event that is over, or one a calendar has already: the same title and start, or another event from the same mail at the same time. It then gives that event's id. At most ${String(limits.creates)} per run.`,
      inputSchema: z.object({
        calendar: calendarKey.optional(),
        title: z.string().trim().min(1).max(200),
        ...timeFields,
        ...detailFields,
        fromMail: z
          .string()
          .describe('The id of the mail the event comes from, such as "m12".'),
        reason,
      }),
      execute: (input) =>
        counted("createdEvents", limits.creates, () =>
          oneCreateAtATime(async () => {
            const calendar = await writable(input.calendar);
            const timing = timingOf(input, timeZone);
            const span = spanOfTiming(timing);
            const at = now().getTime();
            if (span.end <= at) {
              throw new ToolRefusal(
                "That event is over. Only events to come go into the calendar.",
              );
            }
            if (span.start > at + limits.futureDays * DAY) {
              throw new ToolRefusal(
                `That event starts more than ${String(limits.futureDays)} days from now. Check its date.`,
              );
            }
            const mail = source(input.fromMail);
            const same = await findSame(
              timing,
              input.title,
              mail?.messageId ?? null,
            );
            if (same) {
              throw new ToolRefusal(
                `The calendar has this event already: ${JSON.stringify(same)}. Use update_event on ${same.id} to change its title, time or details.`,
              );
            }
            const name = randomUUID();
            const uid = `${name}${ASSISTANT_UID_DOMAIN}`;
            const session = await calendars.session(calendar);
            const ics = buildEventIcs({
              uid,
              title: input.title,
              timing,
              location: input.location?.trim() || null,
              description: input.notes?.trim() || null,
              url: mail?.href ?? null,
              sourceMessageId: mail?.messageId ?? null,
              alarms: triggersOf(
                input.alarmMinutes ??
                  (timing.allDay
                    ? DEFAULT_ALL_DAY_ALARMS
                    : DEFAULT_TIMED_ALARMS),
              ),
              now: now(),
            });
            const created = await session.createEvent(
              calendar.url,
              `${name}.ics`,
              ics,
            );
            const etag = await etagAfterWrite(
              session,
              created.url,
              created.etag,
            );
            const ref: EventRef = {
              calendarKey: calendar.key,
              url: created.url,
              etag,
              title: input.title,
            };
            const id = handles.register(ref);
            await log("create_event", calendar, mail, input.reason, {
              href: created.url,
              etag,
              uid,
              title: input.title,
              start: input.start,
              end: input.end ?? null,
              allDay: input.allDay,
            });
            return { id, calendar: calendar.key, created: true };
          }),
        ),
    }),

    update_event: agentTool({
      description: `Changes an event: give only what changes; new times need start and allDay. Repeating events and events with attendees cannot change. At most ${String(limits.updates)} per run.`,
      inputSchema: z.object({
        id: eventId,
        title: z.string().trim().min(1).max(200).optional(),
        ...timeFields,
        start: timeFields.start.optional(),
        allDay: timeFields.allDay.optional(),
        ...detailFields,
        fromMail,
        reason,
      }),
      execute: (input) =>
        counted("updatedEvents", limits.updates, async () => {
          let timing: EventTiming | undefined;
          if (hasTimeChange(input)) {
            if (input.start === undefined || input.allDay === undefined) {
              throw new ToolRefusal(
                "For new times, give start and allDay, with the end and zones.",
              );
            }
            timing = timingOf(
              { ...input, start: input.start, allDay: input.allDay },
              timeZone,
            );
          }
          const mail = source(input.fromMail);
          const found = await current(input.id);
          const edit: EventEdit = { now: now() };
          if (input.title !== undefined) edit.title = input.title;
          if (timing) edit.timing = timing;
          if (input.location !== undefined) {
            edit.location = input.location.trim() || null;
          }
          if (input.notes !== undefined) {
            edit.description = input.notes.trim() || null;
          }
          if (input.alarmMinutes !== undefined) {
            edit.alarms = triggersOf(input.alarmMinutes);
          }
          if (mail?.href) edit.url = mail.href;
          let data: string;
          try {
            data = editEventIcs(found.object.data, edit);
          } catch (error) {
            if (error instanceof IcsEditError) {
              throw new ToolRefusal(`Event ${input.id}: ${error.message}`);
            }
            throw error;
          }
          let written: { etag: string | null };
          try {
            written = await found.session.updateEvent(
              found.ref.url,
              data,
              found.object.etag,
            );
          } catch (error) {
            if (!isStale(error)) throw error;
            handles.forget(input.id, "it changed while this run wrote it.");
            throw new ToolRefusal(
              `Event ${input.id} changed while this run wrote it. List the events again.`,
            );
          }
          const etag = await etagAfterWrite(
            found.session,
            found.ref.url,
            written.etag,
          );
          handles.update(input.id, {
            etag,
            title: input.title ?? found.ref.title,
          });
          await log("update_event", found.calendar, mail, input.reason, {
            href: found.ref.url,
            etag,
            uid: found.event.uid,
            title: input.title ?? found.event.title,
            ...(timing
              ? {
                  start: input.start,
                  end: input.end ?? null,
                  allDay: input.allDay,
                }
              : {}),
            previous: previousOf(found.object),
          });
          const [event] = readIcsEvents(data, timeZone);
          return {
            updated: eventView(input.id, found.calendar, event, [event]),
          };
        }),
    }),

    delete_event: agentTool({
      description: `Deletes an event, such as a cancelled booking. Repeating events and events with attendees cannot be deleted. At most ${String(limits.deletes)} per run.`,
      inputSchema: z.object({ id: eventId, fromMail, reason }),
      execute: (input) =>
        counted("deletedEvents", limits.deletes, async () => {
          const mail = source(input.fromMail);
          const found = await current(input.id);
          try {
            await found.session.deleteEvent(found.ref.url, found.object.etag);
          } catch (error) {
            if (!isStale(error)) throw error;
            handles.forget(input.id, "it changed while this run deleted it.");
            throw new ToolRefusal(
              `Event ${input.id} changed while this run deleted it. List the events again.`,
            );
          }
          handles.forget(input.id, "this run deleted it.");
          await log("delete_event", found.calendar, mail, input.reason, {
            href: found.ref.url,
            uid: found.event.uid,
            title: found.event.title,
            previous: previousOf(found.object),
          });
          return { deleted: input.id };
        }),
    }),
  };

  return { tools, stats };
}
