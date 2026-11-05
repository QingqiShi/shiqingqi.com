import { z } from "zod";
import type { CalendarObject } from "#src/assistant/calendar/caldav/types.ts";
import { eventsInRange } from "#src/assistant/calendar/ics/events-in-range.ts";
import {
  addDays,
  instantOf,
  parseLocalTime,
} from "#src/assistant/calendar/ics/instant-of.ts";
import {
  readIcsEvents,
  type IcsEvent,
} from "#src/assistant/calendar/ics/read-ics-events.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import { calendarKey, DAY } from "./constants.ts";
import { createEventWriteTools } from "./create-event-write-tools.ts";
import type { EventHandles } from "./event-handles.ts";
import { register, type eventView } from "./event-view.ts";
import type { RunCalendars } from "./run-calendars.ts";
import type { CalendarToolStats, SourceMail } from "./types.ts";

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

function matchesText(events: IcsEvent[], text: string) {
  const needle = text.toLowerCase();
  return events.some((event) =>
    [event.title, event.location, event.description].some((value) =>
      value?.toLowerCase().includes(needle),
    ),
  );
}

/**
 * The calendar tools of an agent run. Every guardrail lives in these tools,
 * not in a prompt: they act only on the user's own iCloud calendars, on calendars
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
}: CalendarToolsInput): {
  tools: AgentTools;
  stats: CalendarToolStats;
} {
  const stats: CalendarToolStats = {
    createdEvents: 0,
    updatedEvents: 0,
    deletedEvents: 0,
  };

  const tools: AgentTools = {
    list_calendars: agentTool({
      description:
        "The owner's iCloud calendars, each with the key the other tools take. canWrite is false for a calendar you may only read.",
      inputSchema: z.object({}),
      describe: () => ({ kind: "list_calendars" }),
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
      describe: ({ from, to }) => ({ kind: "list_events", from, to }),
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
                view: register(handles, calendar, object, event, events),
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

    ...createEventWriteTools({
      limits,
      calendars,
      handles,
      timeZone,
      sourceMail,
      run,
      now,
      stats,
    }),
  };

  return { tools, stats };
}
