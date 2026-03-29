import type { UIMessage } from "ai";

export function isUIMessage(val: unknown): val is UIMessage {
  if (typeof val !== "object" || val === null) return false;
  return (
    "id" in val &&
    typeof val.id === "string" &&
    "role" in val &&
    typeof val.role === "string" &&
    "parts" in val &&
    Array.isArray(val.parts)
  );
}
