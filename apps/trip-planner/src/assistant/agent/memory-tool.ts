import { getAnthropicProvider } from "@tuja/server-clients/get-anthropic-provider";
import "server-only";
import { describeError } from "#src/assistant/describe-error.ts";
import {
  memories,
  type Memory,
  type MemoryScope,
} from "#src/assistant/store/memories.ts";
import { asViewer, type Transaction } from "#src/trips/as-viewer.ts";
import type { TurnContext } from "./turn-trust.ts";

/** What the model sends to Anthropic's memory tool (`memory_20250818`). */
export type MemoryCommand =
  | { command: "view"; path: string; view_range?: [number, number] }
  | { command: "create"; path: string; file_text: string }
  | { command: "str_replace"; path: string; old_str: string; new_str: string }
  | {
      command: "insert";
      path: string;
      insert_line: number;
      insert_text: string;
    }
  | { command: "delete"; path: string }
  | { command: "rename"; old_path: string; new_path: string };

const ROOT = "/memories";
const DIRECTORIES = {
  trip: "/memories/trip",
  personal: "/memories/me",
} as const;
type ScopeName = keyof typeof DIRECTORIES;
const SCOPE_NAMES = ["trip", "personal"] as const satisfies ScopeName[];

/** The longest memory file, so that the memories stay short to read. */
export const MAX_MEMORY_FILE_CHARS = 4000;

interface Located {
  scope: ScopeName;
  /** The path in the scope, or "" for the scope's directory. */
  path: string;
}

class MemoryError extends Error {}

function locate(raw: string): Located | "root" {
  const path = raw.trim().replace(/\/+$/, "");
  if (path === ROOT || path === "") return "root";
  for (const scope of SCOPE_NAMES) {
    const directory = DIRECTORIES[scope];
    if (path === directory) return { scope, path: "" };
    if (path.startsWith(`${directory}/`)) {
      return { scope, path: path.slice(directory.length + 1) };
    }
  }
  throw new MemoryError(
    `${raw} is not a memory path. Use ${DIRECTORIES.trip}/… for this trip, shared by its members, or ${DIRECTORIES.personal}/… for the person's own memory.`,
  );
}

function fileOf(raw: string): Located {
  const located = locate(raw);
  if (located === "root" || located.path === "") {
    throw new MemoryError(`${raw} is a directory, not a file.`);
  }
  return located;
}

function storeScope(context: TurnContext, scope: ScopeName): MemoryScope {
  return scope === "trip" ? { tripId: context.tripId } : "personal";
}

function fullPath(scope: ScopeName, path: string): string {
  return `${DIRECTORIES[scope]}/${path}`;
}

function listing(scope: ScopeName, files: readonly Memory[]): string {
  const lines = files.map(
    (file) =>
      `${fullPath(scope, file.path)} (${String(file.content.length)} characters)`,
  );
  return lines.length > 0
    ? lines.join("\n")
    : `${DIRECTORIES[scope]} is empty.`;
}

function numbered(content: string, range?: [number, number]): string {
  const lines = content.split("\n");
  const [from, to] = range ?? [1, lines.length];
  const last = to === -1 ? lines.length : Math.min(to, lines.length);
  return lines
    .slice(from - 1, last)
    .map((line, i) => `${String(from + i).padStart(6)}\t${line}`)
    .join("\n");
}

const WRITE_ANSWERS = {
  forbidden: "The person cannot change this memory.",
  invalid:
    "The path is not valid: use letters, digits, '.', '_' and '-', such as preferences.md.",
  full: "This memory is full. Delete or shorten a file first.",
} as const;

async function write(
  tx: Transaction,
  scope: MemoryScope,
  path: string,
  content: string,
): Promise<void> {
  if (content.length > MAX_MEMORY_FILE_CHARS) {
    throw new MemoryError(
      `A memory file holds at most ${String(MAX_MEMORY_FILE_CHARS)} characters. Keep it short.`,
    );
  }
  const result = await memories.write(tx, scope, path, content);
  if (result !== "written") throw new MemoryError(WRITE_ANSWERS[result]);
}

async function readFile(
  tx: Transaction,
  context: TurnContext,
  { scope, path }: Located,
): Promise<Memory> {
  const file = await memories.read(tx, storeScope(context, scope), path);
  if (!file) {
    throw new MemoryError(`${fullPath(scope, path)} does not exist.`);
  }
  return file;
}

async function run(
  tx: Transaction,
  context: TurnContext,
  input: MemoryCommand,
): Promise<string> {
  if (input.command === "view") {
    const located = locate(input.path);
    if (located === "root") {
      const [trip, personal] = await Promise.all([
        memories.list(tx, storeScope(context, "trip")),
        memories.list(tx, "personal"),
      ]);
      return `${listing("trip", trip)}\n${listing("personal", personal)}`;
    }
    if (located.path === "") {
      const files = await memories.list(tx, storeScope(context, located.scope));
      return listing(located.scope, files);
    }
    const file = await readFile(tx, context, located);
    return numbered(file.content, input.view_range);
  }

  if (context.trust.tainted) {
    throw new MemoryError(
      "Memory cannot change in this turn, because it holds content that the person pasted. Only what a member says in their own words goes to memory.",
    );
  }

  switch (input.command) {
    case "create": {
      const file = fileOf(input.path);
      await write(
        tx,
        storeScope(context, file.scope),
        file.path,
        input.file_text,
      );
      remembered(context, file, "written");
      return `File created: ${input.path}`;
    }
    case "str_replace": {
      const located = fileOf(input.path);
      const file = await readFile(tx, context, located);
      const count = file.content.split(input.old_str).length - 1;
      if (count !== 1) {
        throw new MemoryError(
          count === 0
            ? `The text was not found in ${input.path}.`
            : `The text is in ${input.path} ${String(count)} times. Give more of it, so that it is there once.`,
        );
      }
      await write(
        tx,
        storeScope(context, located.scope),
        located.path,
        file.content.replace(input.old_str, () => input.new_str),
      );
      remembered(context, located, "written");
      return `File edited: ${input.path}`;
    }
    case "insert": {
      const located = fileOf(input.path);
      const file = await readFile(tx, context, located);
      const lines = file.content.split("\n");
      if (input.insert_line < 0 || input.insert_line > lines.length) {
        throw new MemoryError(
          `Line ${String(input.insert_line)} is not in ${input.path}, which has ${String(lines.length)} lines.`,
        );
      }
      lines.splice(input.insert_line, 0, input.insert_text);
      await write(
        tx,
        storeScope(context, located.scope),
        located.path,
        lines.join("\n"),
      );
      remembered(context, located, "written");
      return `Text inserted: ${input.path}`;
    }
    case "delete": {
      const located = locate(input.path);
      if (located === "root" || located.path === "") {
        throw new MemoryError("Delete a file, not a whole memory.");
      }
      const count = await memories.remove(
        tx,
        storeScope(context, located.scope),
        located.path,
      );
      if (count === null) throw new MemoryError(WRITE_ANSWERS.forbidden);
      if (count === 0) throw new MemoryError(`${input.path} does not exist.`);
      remembered(context, located, "deleted");
      return `Deleted: ${input.path}`;
    }
    case "rename": {
      const from = fileOf(input.old_path);
      const to = fileOf(input.new_path);
      if (from.scope !== to.scope) {
        const file = await readFile(tx, context, from);
        await write(tx, storeScope(context, to.scope), to.path, file.content);
        await memories.remove(tx, storeScope(context, from.scope), from.path);
      } else {
        const result = await memories.rename(
          tx,
          storeScope(context, from.scope),
          from.path,
          to.path,
        );
        if (result !== "renamed") {
          throw new MemoryError(
            result === "missing"
              ? `${input.old_path} does not exist.`
              : result === "exists"
                ? `${input.new_path} exists already.`
                : WRITE_ANSWERS[result],
          );
        }
      }
      remembered(context, to, "renamed");
      return `Renamed ${input.old_path} to ${input.new_path}`;
    }
  }
}

function remembered(
  context: TurnContext,
  { scope, path }: Located,
  action: "written" | "deleted" | "renamed",
) {
  context.emit({ type: "remembered", scope, path, action });
}

/**
 * Runs one command of Anthropic's memory tool on the trip's memory and the
 * asker's own memory, in one transaction. The answer is the text for the
 * model; an error is an answer too, so that the model can try again.
 */
export async function runMemoryCommand(
  context: TurnContext,
  input: MemoryCommand,
): Promise<string> {
  const events: Parameters<TurnContext["emit"]>[0][] = [];
  const buffered: TurnContext = { ...context, emit: (e) => events.push(e) };
  try {
    const answer = await asViewer(context.db, context.userId, (tx) =>
      run(tx, buffered, input),
    );
    for (const event of events) context.emit(event);
    return answer;
  } catch (error) {
    if (error instanceof MemoryError) return `Error: ${error.message}`;
    console.error("Assistant memory failed:", describeError(error));
    return "Error: the memory could not be read or written. Try again later.";
  }
}

/**
 * Anthropic's memory tool for the AI SDK, under the key `memory`, on the
 * trip's memory (`/memories/trip`) and the asker's own (`/memories/me`).
 */
export function memoryTool(context: TurnContext) {
  return getAnthropicProvider().tools.memory_20250818({
    execute: async (input, { toolCallId }) => {
      context.emit({
        type: "tool",
        toolCallId,
        tool: "memory",
        state: "start",
      });
      try {
        return await runMemoryCommand(context, input);
      } finally {
        context.emit({
          type: "tool",
          toolCallId,
          tool: "memory",
          state: "end",
        });
      }
    },
  });
}
