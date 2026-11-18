/** How a turn ended. */
export type TurnStatus = "ok" | "failed" | "timeout";

/** What a watcher of a turn sees, in order. `done` is always last. */
export type TurnEvent =
  /** A piece of the assistant's text. */
  | { type: "text"; text: string }
  /** A tool call started or ended. */
  | {
      type: "tool";
      toolCallId: string;
      tool: string;
      state: "start" | "end";
    }
  /** A change that the assistant saved (`applied`, which the person can undo) or proposed (`proposal`, a card to accept or skip). */
  | {
      type: "change";
      changeId: string;
      kind: "applied" | "proposal";
      summary: string;
      dayIds: string[];
    }
  /** A question to the person, with options to tap. */
  | { type: "question"; question: string; options: string[] }
  /** The assistant wrote to or deleted from a memory. */
  | {
      type: "remembered";
      scope: "trip" | "personal";
      path: string;
      action: "written" | "deleted" | "renamed";
    }
  | { type: "done"; status: TurnStatus };

/**
 * The events of one turn, kept from the start, so that a watcher who comes
 * late, or goes and comes back, sees all of them. Nobody needs to watch for
 * the turn to go on.
 */
export class TurnEvents implements AsyncIterable<TurnEvent> {
  readonly #events: TurnEvent[] = [];
  readonly #waiting = new Set<() => void>();
  #ended = false;

  push(event: TurnEvent): void {
    if (this.#ended) return;
    this.#events.push(event);
    if (event.type === "done") this.#ended = true;
    for (const wake of this.#waiting) wake();
    this.#waiting.clear();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<TurnEvent> {
    let next = 0;
    for (;;) {
      while (next < this.#events.length) {
        yield this.#events[next++];
      }
      if (this.#ended) return;
      await new Promise<void>((resolve) => this.#waiting.add(resolve));
    }
  }
}
