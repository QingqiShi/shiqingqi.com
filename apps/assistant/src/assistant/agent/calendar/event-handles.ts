import { ToolRefusal } from "../agent-tool.ts";
import type { EventView } from "./create-calendar-tools.ts";

/** Where one event is, as the run last saw it. */
export interface EventRef {
  calendarKey: string;
  url: string;
  /** The version the run saw; a write sends it, so a change since then is refused. */
  etag: string | null;
  title: string;
  /** The start of one occurrence of a repeating event, which gets an id of its own. */
  occurrence?: number;
}

function keyOf(ref: EventRef) {
  return ref.occurrence === undefined
    ? ref.url
    : `${ref.url}#${String(ref.occurrence)}`;
}

const HANDLE = /^e[1-9]\d*$/;

/**
 * The short ids, such as `e3`, that stand for calendar events in one agent
 * run. Only the run's own list and create tools make them, so a tool never
 * changes an event that the run did not see, and an id from another run
 * means nothing here. Each id also holds the view the model has of its event.
 */
export class EventHandles {
  readonly #refs = new Map<string, EventRef>();
  readonly #views = new Map<string, EventView>();
  readonly #idOfKey = new Map<string, string>();
  /** Why an id stopped working. */
  readonly #gone = new Map<string, string>();
  #next = 1;

  /** The view of the event at this URL, or of one occurrence of it, with its id; the same event listed twice keeps its id and gets the newer version. */
  register(ref: EventRef, viewOf: (id: string) => EventView): EventView {
    const known = this.#idOfKey.get(keyOf(ref));
    if (known) {
      this.#refs.set(known, ref);
      this.#gone.delete(known);
      return this.#show(known, viewOf);
    }
    const id = `e${String(this.#next)}`;
    this.#next += 1;
    this.#refs.set(id, ref);
    this.#idOfKey.set(keyOf(ref), id);
    return this.#show(id, viewOf);
  }

  #show(id: string, viewOf: (id: string) => EventView) {
    const view = viewOf(id);
    this.#views.set(id, view);
    return view;
  }

  /** What the model knows of the event now; undefined for an id that is unknown or gone. */
  view(id: string): EventView | undefined {
    return this.#views.get(id);
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

  update(
    id: string,
    change: Partial<Omit<EventRef, "url">>,
    viewOf: (id: string) => EventView,
  ): EventView {
    this.#refs.set(id, { ...this.get(id), ...change });
    return this.#show(id, viewOf);
  }

  /** Its id stops working, and says why, until a list finds the event again. */
  forget(id: string, why: string) {
    this.#refs.delete(id);
    this.#views.delete(id);
    this.#gone.set(id, why);
  }
}
