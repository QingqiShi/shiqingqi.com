import type { SupportedLocale } from "#src/types.ts";

// The one place that declares a custom event. Every name and property shape
// lives here, so no call site can invent or reshape an event.
export type AnalyticsEvents = {
  "conversation started": { locale: SupportedLocale };
  "message sent": {
    locale: SupportedLocale;
    started_conversation: boolean;
    conversation_message_count: number;
  };
};

/** One declared event with the properties its name asks for. */
export type AnalyticsEvent = {
  [Name in keyof AnalyticsEvents]: {
    name: Name;
    properties: AnalyticsEvents[Name];
  };
}[keyof AnalyticsEvents];
