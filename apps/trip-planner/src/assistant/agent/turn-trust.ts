import type { TripsDb } from "#src/db/types.ts";
import { ToolRefusal } from "./agent-tool.ts";
import type { Researcher } from "./research/research-agent.ts";
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

  #memoryHeld = false;

  /**
   * Whether memory cannot change in a turn that is not tainted: its message
   * is a tapped option, which the model wrote, in a conversation that holds
   * content that no member wrote. Changes to the trip stay allowed.
   */
  get memoryHeld(): boolean {
    return this.#memoryHeld;
  }

  holdMemory(): void {
    this.#memoryHeld = true;
  }
}

/** What the tools of one turn act on, and as whom. */
export interface TurnContext {
  db: TripsDb;
  /** The asker: every read and write runs as this user. */
  userId: string;
  /** Null in a conversation that starts a new trip, until `create_trip` makes it. */
  tripId: string | null;
  conversationId: string;
  trust: TurnTrust;
  emit: (event: TurnEvent) => void;
  /** What the person wrote in this turn: the only source of links for the research sub-agent. */
  memberText: string;
  researcher: Researcher;
  /** The names of the files attached in this conversation: a proposal can name one as its source. */
  attachmentNames: ReadonlySet<string>;
  /** Aborts when the turn runs out of time. */
  signal: AbortSignal;
}

export const NO_TRIP =
  "There is no trip yet: this conversation starts a new one. Make it with create_trip first.";

/** The trip of the turn; a refusal for the model when there is none yet. */
export function tripOf(context: TurnContext): string {
  if (context.tripId === null) throw new ToolRefusal(NO_TRIP);
  return context.tripId;
}
