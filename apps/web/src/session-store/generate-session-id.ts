import { randomUUID } from "crypto";
import "server-only";

export function generateSessionId(): string {
  return randomUUID();
}
