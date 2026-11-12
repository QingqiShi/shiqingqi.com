import { isRecord } from "#src/movie-database/is-record.ts";

const TOOL_ERROR_MARKER = "__toolError";

type ToolErrorReason =
  "tmdb_unavailable" | "summary_generation_failed" | "no_match";

interface ToolErrorResult {
  [TOOL_ERROR_MARKER]: true;
  reason: ToolErrorReason;
  message: string;
}

export function toolError(
  reason: ToolErrorReason,
  message: string,
): ToolErrorResult {
  return { [TOOL_ERROR_MARKER]: true, reason, message };
}

export function isToolError(value: unknown): value is ToolErrorResult {
  return isRecord(value) && value[TOOL_ERROR_MARKER] === true;
}
