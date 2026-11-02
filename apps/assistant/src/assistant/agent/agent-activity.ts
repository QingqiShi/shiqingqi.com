import { z } from "zod";

const MAX_TEXT_CHARS = 200;

/**
 * Postgres refuses a jsonb value that holds a NUL or one half of a surrogate
 * pair, so a mail header with one of these or a cut in a pair stops every
 * progress write.
 */
function shortText(text: string) {
  const clean = text.replaceAll(/\p{Cc}+/gu, " ").trim();
  const short =
    clean.length > MAX_TEXT_CHARS
      ? `${clean.slice(0, MAX_TEXT_CHARS - 1)}…`
      : clean;
  return short.toWellFormed();
}

const text = z.string().transform(shortText);
/** A call on several mails: how many, and the headers of the first. */
const mails = {
  count: z.number().int().positive(),
  subject: text,
  sender: text,
};

function bare<Kind extends string>(kind: Kind) {
  return z.object({ kind: z.literal(kind) });
}

/**
 * What a tool call of a run is doing, for the home page to say in the
 * owner's language: never localised text, and only mail headers, folder
 * names, event titles and to-do titles, never mail text or what the reader
 * says of it. Parsing it cuts long text and drops any other field.
 */
export const agentActivity = z.discriminatedUnion("kind", [
  /** The call's input or a mail or event id in it is not valid; the tool will refuse it. */
  bare("other"),
  bare("list_accounts"),
  bare("list_folders"),
  z.object({ kind: z.literal("list_mail"), folder: text }),
  z.object({ kind: z.literal("read_mail"), ...mails }),
  z.object({ kind: z.literal("move_mail"), ...mails, toFolder: text }),
  z.object({ kind: z.literal("mark_read"), ...mails, read: z.boolean() }),
  z.object({ kind: z.literal("mark_flagged"), ...mails, flagged: z.boolean() }),
  z.object({ kind: z.literal("create_folder"), folder: text }),
  z.object({ kind: z.literal("rename_folder"), folder: text, newName: text }),
  z.object({ kind: z.literal("delete_folder"), folder: text }),
  bare("list_calendars"),
  /** `from` and `to` are the first and last day, `YYYY-MM-DD`. */
  z.object({ kind: z.literal("list_events"), from: text, to: text }),
  z.object({ kind: z.literal("create_event"), title: text }),
  z.object({ kind: z.literal("update_event"), title: text }),
  z.object({ kind: z.literal("delete_event"), title: text }),
  bare("list_todos"),
  z.object({ kind: z.literal("add_todo"), title: text }),
  z.object({ kind: z.literal("complete_todo"), title: text }),
  z.object({ kind: z.literal("update_todo"), title: text }),
  bare("write_report"),
]);

export type AgentActivity = z.output<typeof agentActivity>;

export const OTHER_ACTIVITY = {
  kind: "other",
} as const satisfies AgentActivity;

/** The activity as it may be stored, or `other` when it is not valid. */
export function storableActivity(activity: AgentActivity): AgentActivity {
  return agentActivity.safeParse(activity).data ?? OTHER_ACTIVITY;
}

/**
 * What a run is doing now, in `agent_runs.progress`. An empty `inFlight`
 * means that the model is thinking.
 */
export interface AgentRunProgress {
  inFlight: AgentActivity[];
  /** The calls that ended last, newest first. */
  recent: AgentActivity[];
}
