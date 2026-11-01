import { digestHandlers } from "#src/assistant/digest/digest-handlers.ts";

/** The mailbox writes run after the response, within this time. */
export const maxDuration = 90;

export const POST = digestHandlers.items;
