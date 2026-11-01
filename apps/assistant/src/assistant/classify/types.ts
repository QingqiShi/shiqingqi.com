import type {
  SenderRuleBucket,
  SenderRuleMatch,
} from "#src/assistant/db/schema.ts";

/** Every question the model answers may be answered "unclear". */
export type Answer = "yes" | "no" | "unclear";

/** The model's answers about one mail. The truth table turns them into a bucket. */
export interface MailFacts {
  /** A name from the user's categories, "none" or "unclear". */
  category: string;
  asksUserToAct: Answer;
  personal: Answer;
  marketing: Answer;
  worthKnowing: Answer;
  securityAlert: Answer;
  oneTimeCode: Answer;
  /** `YYYY-MM-DD`: the date by which the mail asks the user to act. */
  dueDate: string | null;
}

export type EventKind = "appointment" | "travel" | "deadline" | "other";

export type EventChange = "new" | "update" | "cancel";

/** A calendar entry that a mail asks for. Only a `sure` one is written to the calendar without asking. */
export interface MailEvent {
  kind: EventKind;
  /** `update` and `cancel` refer to the event of an earlier mail in the same thread. */
  change: EventChange;
  title: string;
  /** `YYYY-MM-DD` when `allDay`, else the local `YYYY-MM-DDTHH:mm` in `timeZone`. */
  start: string;
  /** In the form of `start`, and not before it; null when the mail does not say. */
  end: string | null;
  allDay: boolean;
  /** IANA. The user's zone when the mail gave none, and then `certainty` is `unsure`. */
  timeZone: string;
  location: string | null;
  certainty: "sure" | "unsure";
}

/** A confirmed sender rule, as classification applies it. */
export interface SenderRule {
  id: string;
  match: SenderRuleMatch;
  pattern: string;
  bucket: SenderRuleBucket;
  categoryId: string | null;
}
