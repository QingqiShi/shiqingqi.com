import type { DigestSection } from "./per-section.ts";

export type { DigestSection };

/** Mail of one thread in one section, shown as one item. */
export interface DigestGroup {
  /** Classification ids, newest mail first. */
  ids: string[];
  /** The model's sentence; null when the code arranged the group, and then the page shows the summary. */
  line: string | null;
  /** An open `act` item from an earlier digest. */
  carriedOver: boolean;
}

/** What a digest stores, in the order the page shows it. */
export interface DigestContent {
  version: 1;
  /** Most urgent first. */
  sections: Record<DigestSection, DigestGroup[]>;
  /** Classification ids of mail that has an event, soonest first. */
  calendar: string[];
  /** How many mails were filed into each category since the last digest. */
  filed: { categoryId: string | null; count: number }[];
  /** On a Sunday: classification ids of filed mail of the week, for the user to check. */
  sample: string[];
}
