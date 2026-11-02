import { ToolRefusal } from "../agent-tool.ts";

/** Where one event is, as the run last saw it. */
export interface EventRef {
  calendarKey: string;
  url: string;
  /** The version the run saw; a write sends it, so a change since then is refused. */
  etag: string | null;
  title: string;
}

const HANDLE = /^e[1-9]\d*$/;

/**
 * The short ids, such as `e3`, that stand for calendar events in one agent
 * run. Only the run's own list and create tools make them, so a tool never
 * changes an event that the run did not see, and an id from another run
 * means nothing here.
 */
export class EventHandles {
  readonly #refs = new Map<string, EventRef>();
  readonly #idOfUrl = new Map<string, string>();
  /** Why an id stopped working. */
  readonly #gone = new Map<string, string>();
  #next = 1;

  /** The id of the event at this URL; the same event listed twice keeps its id and gets the newer version. */
  register(ref: EventRef): string {
    const known = this.#idOfUrl.get(ref.url);
    if (known) {
      this.#refs.set(known, ref);
      this.#gone.delete(known);
      return known;
    }
    const id = `e${String(this.#next)}`;
    this.#next += 1;
    this.#refs.set(id, ref);
    this.#idOfUrl.set(ref.url, id);
    return id;
  }

  get(id: string): EventRef {
    const gone = this.#gone.get(id);
    if (gone) throw new ToolRefusal(`Event ${id}: ${gone}`);
    const ref = HANDLE.test(id) ? this.#refs.get(id) : undefined;
    if (!ref) {
      throw new ToolRefusal(
        `Unknown event id "${id}". Use the ids that list_events or create_event gave in this run.`,
      );
    }
    return ref;
  }

  update(id: string, change: Partial<Omit<EventRef, "url">>) {
    this.#refs.set(id, { ...this.get(id), ...change });
  }

  /** Its id stops working, and says why, until a list finds the event again. */
  forget(id: string, why: string) {
    this.#refs.delete(id);
    this.#gone.set(id, why);
  }
}
