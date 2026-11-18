import { and, asc, eq, isNull, sql } from "drizzle-orm";
import "server-only";
import { assistantMemories } from "#src/db/schema.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";
import { callFunction } from "./call-function.ts";

/**
 * A trip's memory, which every member of the trip reads and an owner or an
 * editor changes, or the viewer's own memory across all trips.
 */
export type MemoryScope = { tripId: string } | "personal";

/**
 * A path is like `preferences.md` or `food/dislikes.md`: at most 200
 * characters, of letters, digits, `.`, `_` and `-`, with no part that
 * starts with `.`. A file holds at most 16 KiB, and a scope at most 100 files.
 */
export interface Memory {
  path: string;
  content: string;
  updatedAt: Date;
}

function tripOf(scope: MemoryScope): string | null {
  return scope === "personal" ? null : scope.tripId;
}

function inScope(scope: MemoryScope) {
  return scope === "personal"
    ? and(
        eq(assistantMemories.userId, sql`public.trips_viewer_id()`),
        isNull(assistantMemories.tripId),
      )
    : eq(assistantMemories.tripId, scope.tripId);
}

/** The files of a scope, by path. Row-level security gives none to a non-member. */
function list(tx: Transaction, scope: MemoryScope): Promise<Memory[]> {
  return tx
    .select({
      path: assistantMemories.path,
      content: assistantMemories.content,
      updatedAt: assistantMemories.updatedAt,
    })
    .from(assistantMemories)
    .where(inScope(scope))
    .orderBy(asc(assistantMemories.path));
}

async function read(
  tx: Transaction,
  scope: MemoryScope,
  path: string,
): Promise<Memory | null> {
  const rows = await tx
    .select({
      path: assistantMemories.path,
      content: assistantMemories.content,
      updatedAt: assistantMemories.updatedAt,
    })
    .from(assistantMemories)
    .where(and(inScope(scope), eq(assistantMemories.path, path)));
  return rows.at(0) ?? null;
}

export type WriteMemoryResult = "written" | "forbidden" | "invalid" | "full";

/** Writes a file in place of any file at its path. */
function write(
  tx: Transaction,
  scope: MemoryScope,
  path: string,
  content: string,
): Promise<WriteMemoryResult> {
  return callFunction(
    tx,
    sql`public.assistant_write_memory(${tripOf(scope)}::uuid, ${path}, ${content})`,
  );
}

/**
 * Deletes the file at the path, or every file under it as a directory, and
 * gives how many went. Null when the viewer cannot change the scope.
 */
function remove(
  tx: Transaction,
  scope: MemoryScope,
  path: string,
): Promise<number | null> {
  return callFunction(
    tx,
    sql`public.assistant_delete_memory(${tripOf(scope)}::uuid, ${path})`,
  );
}

export type RenameMemoryResult =
  "renamed" | "forbidden" | "invalid" | "missing" | "exists";

/** Moves the file at a path, or every file under it as a directory, to a new path. */
function rename(
  tx: Transaction,
  scope: MemoryScope,
  fromPath: string,
  toPath: string,
): Promise<RenameMemoryResult> {
  return callFunction(
    tx,
    sql`public.assistant_rename_memory(${tripOf(scope)}::uuid, ${fromPath}, ${toPath})`,
  );
}

/** The assistant's memory files. Each function takes a transaction of `asViewer`. */
export const memories = { list, read, write, remove, rename };
