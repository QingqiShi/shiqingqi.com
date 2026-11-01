/** The mail a line or a to-do came from: enough to open it in the owner's mail app, nothing of its content. */
export interface MailSource {
  accountId: string;
  /** The Message-ID header, in angle brackets. */
  messageId: string;
}

export interface ReportItem {
  text: string;
  source: MailSource | null;
}

/**
 * - `written`: the model wrote the report.
 * - `no-mail`: no mail came that day, so there was nothing to write.
 * - `no-model`: no API key is set.
 * - `failed`: the model call failed.
 */
export type ReportStatus = "written" | "no-mail" | "no-model" | "failed";

/** What a morning report stores: the model's words and counts, never the mail. */
export interface MorningReportContent {
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
