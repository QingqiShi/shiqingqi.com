import { isRecord } from "#src/utils/type-guards.ts";

export const TOOL_ERROR_MARKER = "__toolError";

export type ToolErrorReason =
  | "tmdb_unavailable"
  | "vector_search_unavailable"
  | "summary_generation_failed";

export interface ToolErrorResult {
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
