import type { TripsDb } from "#src/db/types.ts";
import type { TurnEvent } from "./turn-events.ts";

/**
 * Whether a turn holds content that no member wrote in their own words,
 * such as a long paste, an attachment or a page from the web. Once a turn
 * is tainted, it stays so: its changes can only be proposed, and it writes
 * no memory.
 */
export class TurnTrust {
  #reason: string | null = null;

  /** Why the turn is tainted, or null while it is not. */
  get reason(): string | null {
    return this.#reason;
  }

  get tainted(): boolean {
    return this.#reason !== null;
  }

  /** Marks the turn as tainted. The first reason stays. */
  taint(reason: string): void {
    this.#reason ??= reason;
  }
}

/** What the tools of one turn act on, and as whom. */
export interface TurnContext {
  db: TripsDb;
  /** The asker: every read and write runs as this user. */
  userId: string;
  tripId: string;
  conversationId: string;
  trust: TurnTrust;
  emit: (event: TurnEvent) => void;
}
