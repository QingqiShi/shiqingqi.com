import { newId } from "#src/trips/ops/new-id.ts";

/** A batch as the model writes it: ops that are not checked yet. */
export interface RawBatch {
  summary: string;
  ops: Record<string, unknown>[];
}

/** The id that the model writes for a thing that does not exist yet, such as `$lunch`. */
const PLACEHOLDER = /^\$[A-Za-z0-9_-]{1,40}$/;

/** The keys whose text is the id of a thing of the trip. */
const ID_KEYS = new Set(["id", "dayId", "momentId", "personId", "before"]);

/**
 * How an `id` in a part of an op is read: `new` makes a thing and must be a
 * placeholder, `either` can make a thing or keep one (the entries of a
 * checklist that `setItem` changes), and `existing` names a thing.
 */
type Mode = "new" | "either" | "existing";

export type BindResult =
  { ok: true; batches: RawBatch[] } | { ok: false; reason: string };

/**
 * Puts a new id in place of each placeholder, the same id for the same
 * placeholder through all the batches. A placeholder must be made by an add
 * before an op names it, and only once. `known` gives placeholders that name
 * things that exist, such as `$day1` for the first day of a draft.
 */
export function bindPlaceholders(
  batches: readonly RawBatch[],
  known: ReadonlyMap<string, string> = new Map(),
): BindResult {
  const ids = new Map(known);
  try {
    return {
      ok: true,
      batches: batches.map((batch, b) => ({
        summary: batch.summary,
        ops: batch.ops.map((op, o) =>
          bindOp(op, ids, `Batch ${String(b + 1)}, op ${String(o + 1)}`),
        ),
      })),
    };
  } catch (error) {
    if (error instanceof PlaceholderError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}

class PlaceholderError extends Error {}

function bindOp(
  op: Record<string, unknown>,
  ids: Map<string, string>,
  where: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(op).map(([key, value]) => {
      const mode = modeOf(op.op, key);
      return [
        key,
        ID_KEYS.has(key)
          ? bindId(value, mode, ids, where)
          : bindValue(value, mode, ids, where),
      ];
    }),
  );
}

/** How the ids in the part `key` of an op are read. */
function modeOf(op: unknown, key: string): Mode {
  if (
    (op === "addDay" && key === "id") ||
    (op === "addMoment" && key === "moment") ||
    (op === "addItem" && key === "item")
  ) {
    return "new";
  }
  return op === "setItem" && key === "fields" ? "either" : "existing";
}

function bindValue(
  value: unknown,
  mode: Mode,
  ids: Map<string, string>,
  where: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((each) => bindValue(each, mode, ids, where));
  }
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => {
      if (!ID_KEYS.has(key)) {
        return [key, bindValue(inner, mode, ids, where)];
      }
      return [key, bindId(inner, key === "id" ? mode : "existing", ids, where)];
    }),
  );
}

function bindId(
  value: unknown,
  mode: Mode,
  ids: Map<string, string>,
  where: string,
): unknown {
  if (typeof value !== "string") return value;
  const isPlaceholder = PLACEHOLDER.test(value);
  if (mode === "new" && !isPlaceholder) {
    throw new PlaceholderError(
      `${where}: a new thing needs a placeholder id that starts with $, such as "$lunch", not "${value}".`,
    );
  }
  if (!isPlaceholder) return value;
  const bound = ids.get(value);
  if (mode === "existing") {
    if (bound === undefined) {
      throw new PlaceholderError(
        `${where}: "${value}" names nothing. Make it with an add op before an op names it.`,
      );
    }
    return bound;
  }
  if (bound !== undefined) {
    throw new PlaceholderError(
      `${where}: "${value}" is the id of two new things. Give each new thing its own placeholder.`,
    );
  }
  const id = newId();
  ids.set(value, id);
  return id;
}
