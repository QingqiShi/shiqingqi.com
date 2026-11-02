/** The mail a line or a to-do came from: enough to open it in the owner's mail app, nothing of its content. */
export interface MailSource {
  accountId: string;
  /** The Message-ID header, in angle brackets. */
  messageId: string;
}

export interface ReportItem {
  text: string;
  source: MailSource | null;
  /** The to-do for this line, which the page shows in its place. */
  todoId?: string;
}

/**
 * - `written`: the model wrote the report.
 * - `no-mail`: no mail came that day, so there was nothing to write (version 1 only).
 * - `no-model`: no API key is set.
 * - `failed`: no mailbox could be read, or the model wrote no report.
 */
export type ReportStatus = "written" | "no-mail" | "no-model" | "failed";

/** What a morning report of version 1 stored: one model call over the day's mail. */
export interface MorningReportContentV1 {
  version: 1;
  /** The local day whose mail the report read, `YYYY-MM-DD`: the day before the report's own date. */
  mailDate: string;
  status: ReportStatus;
  promptVersion: number | null;
  /** Null unless the model wrote the report. */
  headline: string | null;
  needsAction: ReportItem[];
  worthKnowing: ReportItem[];
  /** One sentence on the rest of the mail. */
  rest: string | null;
  /** The mails of the day that the assistant read. */
  mailCount: number;
  /** Of `mailCount`, the mails left out of the model's input, which has a size limit. */
  leftOut: number;
  /** Mails that were not read because the time ran out. At most this many; some may be of another day. */
  notRead: number;
  /** True when the time ran out before every mailbox and folder was read. */
  ranOutOfTime: boolean;
  /** The owner's mailboxes that could not be read. */
  unreadMailboxes: { accountId: string; address: string }[];
}

/** One event of the owner's calendar on the report's day. */
export interface AgendaItem {
  title: string;
  allDay: boolean;
  /** `YYYY-MM-DDTHH:mm` in the event's zone, or `YYYY-MM-DD` for an all-day event. */
  start: string;
  /** Null when the event gives none, or ends in another zone, such as a flight. */
  end: string | null;
  /** The event's zone when it is not the owner's; else null. */
  timeZone: string | null;
  location: string | null;
  /** What the mail changes or adds to the event. */
  note: string | null;
}

/** What a morning report of version 2 stores: the report the agent submitted, and counts. */
export interface MorningReportContentV2 {
  version: 2;
  mailDate: string;
  status: Exclude<ReportStatus, "no-mail">;
  headline: string | null;
  /** Mail that needs the owner, most urgent first. */
  needsAction: ReportItem[];
  worthKnowing: ReportItem[];
  rest: string | null;
  /** Today's events; null when the assistant has no calendar of the owner. */
  agenda: AgendaItem[] | null;
  /** The mails of the day that the agent listed. */
  mailCount: number;
  /** True when the time or the step limit made the agent submit early. */
  ranOutOfTime: boolean;
  unreadMailboxes: { accountId: string; address: string }[];
  /** Open to-dos the agent closed because the mail shows they are done. */
  doneTodos: { id: string; title: string; reason: string }[];
}

/** What a morning report stores: the model's words and counts, never the mail. */
export type MorningReportContent =
  MorningReportContentV1 | MorningReportContentV2;
