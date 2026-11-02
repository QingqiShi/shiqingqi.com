import { ToolRefusal } from "../agent-tool.ts";

/** Where one mail is, and what the action log keeps of it. */
export interface MailRef {
  accountKey: string;
  folder: string;
  uidValidity: number;
  /** Null after a move to a server that does not say the new UID: a search by Message-ID finds it. */
  uid: number | null;
  /** In angle brackets. */
  messageId: string;
  subject: string;
  sender: string;
}

const HANDLE = /^m[1-9]\d*$/;

function placeKey(
  ref: Pick<MailRef, "accountKey" | "folder" | "uidValidity" | "uid">,
) {
  return [ref.accountKey, ref.folder, ref.uidValidity, ref.uid].join("\u0000");
}

/**
 * The short ids, such as `m12`, that stand for mail in one agent run. Only
 * the run's own list and read tools make them, so a tool never acts on mail
 * that the run did not see, and an id from another run means nothing here.
 */
export class MailHandles {
  readonly #refs = new Map<string, MailRef>();
  readonly #idOfPlace = new Map<string, string>();
  /** Why an id stopped working. */
  readonly #gone = new Map<string, string>();
  #next = 1;

  /** The id of the mail at this place; the same mail listed twice keeps its id. */
  register(ref: MailRef): string {
    const place = placeKey(ref);
    const known = this.#idOfPlace.get(place);
    if (known) {
      this.#refs.set(known, ref);
      return known;
    }
    const id = `m${String(this.#next)}`;
    this.#next += 1;
    this.#refs.set(id, ref);
    if (ref.uid !== null) this.#idOfPlace.set(place, id);
    return id;
  }

  get(id: string): MailRef {
    const ref = HANDLE.test(id) ? this.#refs.get(id) : undefined;
    const gone = this.#gone.get(id);
    if (gone) throw new ToolRefusal(`Mail ${id}: ${gone}`);
    if (!ref) {
      throw new ToolRefusal(
        `Unknown mail id "${id}". Use the ids that list_mail gave in this run.`,
      );
    }
    return ref;
  }

  /** Puts the mail at its new place, after a move or a new search. */
  update(id: string, change: Partial<MailRef>) {
    const ref = this.get(id);
    if (ref.uid !== null) this.#idOfPlace.delete(placeKey(ref));
    const next = { ...ref, ...change };
    this.#refs.set(id, next);
    if (next.uid !== null) this.#idOfPlace.set(placeKey(next), id);
  }

  /** Puts the mail of a renamed folder, and of the folders inside it, at its new path. */
  renameFolder(
    accountKey: string,
    path: string,
    newPath: string,
    delimiter: string | null,
  ) {
    for (const [id, ref] of [...this.#refs]) {
      if (ref.accountKey !== accountKey) continue;
      if (ref.folder === path) {
        this.update(id, { folder: newPath });
      } else if (delimiter && ref.folder.startsWith(`${path}${delimiter}`)) {
        this.update(id, { folder: newPath + ref.folder.slice(path.length) });
      }
    }
  }

  /** Forgets mail that is not where the run saw it: its id stops working, and says why. */
  forget(id: string, why: string) {
    const ref = this.#refs.get(id);
    if (!ref) return;
    if (ref.uid !== null) this.#idOfPlace.delete(placeKey(ref));
    this.#refs.delete(id);
    this.#gone.set(id, why);
  }
}
