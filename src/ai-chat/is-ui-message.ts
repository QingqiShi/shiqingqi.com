import type { UIMessage } from "ai";

const validRoles = new Set(["system", "user", "assistant"]);

export function isUIMessage(val: unknown): val is UIMessage {
  if (typeof val !== "object" || val === null) return false;
  if (!("id" in val) || typeof val.id !== "string") return false;
  if (!("role" in val) || typeof val.role !== "string") return false;
  if (!validRoles.has(val.role)) return false;
  if (!("parts" in val) || !Array.isArray(val.parts)) return false;
  // Every part must be an object with a string `type` field
  return val.parts.every(
    (part: unknown) =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      typeof part.type === "string",
  );
}
