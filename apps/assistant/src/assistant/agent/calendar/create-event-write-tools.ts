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
  readIcsEvents,
  repeats,
} from "#src/assistant/calendar/ics/read-ics-events.ts";
import type { AgentActionKind } from "#src/assistant/db/schema.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import {
  calendarKey,
  DAY,
  detailFields,
  eventId,
  fromMail,
  MINUTE,
  reason,
  timeFields,
} from "./constants.ts";
import type { EventHandles, EventRef } from "./event-handles.ts";
import { eventView, register } from "./event-view.ts";
import { isSameEvent, SAME_START_MS } from "./is-same-event.ts";
import type { RunCalendar, RunCalendars } from "./run-calendars.ts";
import { hasTimeChange, timingOf } from "./timing-of.ts";
import type { CalendarToolStats, SourceMail } from "./types.ts";

/** 1 h, 30 min and 10 min before a timed event; 09:00 on the day before an all-day one. */
const DEFAULT_TIMED_ALARMS = [60, 30, 10];
const DEFAULT_ALL_DAY_ALARMS = [15 * 60];

function triggersOf(minutes: readonly number[]) {
  return [...new Set(minutes)]
    .sort((a, b) => b - a)
    .map((value) => (value === 0 ? "PT0S" : `-PT${String(value)}M`));
}

function isStale(error: unknown) {
  return error instanceof CalendarRequestError && error.status === 412;
}

/** The tools that write to a calendar: create, update and delete an event. */
export function createEventWriteTools({
  limits,
  calendars,
  handles,
  timeZone,
  sourceMail,
  run,
  now,
  stats,
}: {
  limits: {
    creates: number;
    updates: number;
    deletes: number;
    futureDays: number;
  };
  calendars: RunCalendars;
  handles: EventHandles;
  timeZone: string;
  sourceMail: ((id: string) => SourceMail) | undefined;
  run: AgentRunContext;
  now: () => Date;
  stats: CalendarToolStats;
}) {
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
        calendar.refusal ??
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
          return register(handles, calendar, object, same, events);
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

  return {
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
      describe: ({ title }) => ({ kind: "create_event", title }),
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
      describe: ({ id, title }) => {
        const known = handles.get(id);
        return { kind: "update_event", title: title ?? known.title };
      },
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
          const [event] = readIcsEvents(data, timeZone);
          handles.update(input.id, {
            etag,
            title: input.title ?? found.ref.title,
          });
          const updated = eventView(input.id, found.calendar, event, [event]);
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
          return { updated };
        }),
    }),

    delete_event: agentTool({
      description: `Deletes an event, such as a cancelled booking. Repeating events and events with attendees cannot be deleted. At most ${String(limits.deletes)} per run.`,
      inputSchema: z.object({ id: eventId, fromMail, reason }),
      describe: ({ id }) => ({
        kind: "delete_event",
        title: handles.get(id).title,
      }),
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
  } satisfies AgentTools;
}
