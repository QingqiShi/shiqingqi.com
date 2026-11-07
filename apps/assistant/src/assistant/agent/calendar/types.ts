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
  /** The full URL of the app's page for the mail; null when there is none. */
  href: string | null;
}
