import { oneLineText } from "../report/one-line-text.ts";
import { todoLimits } from "../report/todo-limits.ts";

type QueryValue = string | string[] | undefined;

function firstValue(value: QueryValue) {
  return oneLineText(Array.isArray(value) ? (value[0] ?? "") : (value ?? ""));
}

/**
 * The text for quick add from what another app shared through the Web Share
 * Target: each part once, in one line, as long as a title can be. A long text
 * loses its end and keeps the link.
 */
export function sharedTodoText(shared: {
  title: QueryValue;
  text: QueryValue;
  url: QueryValue;
}): string {
  const title = firstValue(shared.title);
  const text = firstValue(shared.text);
  const url = firstValue(shared.url);
  const words = text.includes(title)
    ? text
    : title.includes(text)
      ? title
      : `${title} ${text}`;
  const link = words.includes(url) ? "" : url;
  const room = todoLimits.titleChars - (link === "" ? 0 : link.length + 1);
  if (room <= 0) return link.slice(0, todoLimits.titleChars);
  return [words.slice(0, room).trimEnd(), link].filter(Boolean).join(" ");
}
