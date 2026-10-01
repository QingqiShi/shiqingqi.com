import type { UIMessage } from "ai";

const validRoles = new Set(["system", "user", "assistant"]);

function isValidPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) return false;
  if (!("type" in part) || typeof part.type !== "string") return false;

  // Validate required fields for part types that carry content.
  // A missing `text` field on a text/reasoning part would send `undefined`
  // to the LLM, so we reject malformed parts at the validation boundary.
  switch (part.type) {
    case "text":
    case "reasoning":
      return "text" in part && typeof part.text === "string";
    case "file":
      return (
        "mediaType" in part &&
        typeof part.mediaType === "string" &&
        "url" in part &&
        typeof part.url === "string"
      );
    default:
      // step-start, source-url, source-document, tool-invocation, data, etc.
      // — no further validation needed for the type guard.
      return true;
  }
}

export function isUIMessage(val: unknown): val is UIMessage {
  if (typeof val !== "object" || val === null) return false;
  if (!("id" in val) || typeof val.id !== "string") return false;
  if (!("role" in val) || typeof val.role !== "string") return false;
  if (!validRoles.has(val.role)) return false;
  if (!("parts" in val) || !Array.isArray(val.parts)) return false;
  return val.parts.every(isValidPart);
}
