import { assistantFetch } from "../http/assistant-fetch.ts";

export function sendBulk(body: object) {
  return assistantFetch("/api/todos/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
