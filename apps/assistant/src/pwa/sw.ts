import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { TODOS_CHANGED_MESSAGE } from "./todos-changed-message.ts";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// The worker precaches the build's static assets only. Pages hold a user's
// mail, so no cache keeps them after sign-out.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.addEventListeners();

interface ReminderActions {
  todoId: string;
  done: string;
  snooze: string;
  failed: string;
}

interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
  reminder: ReminderActions | null;
}

function readReminder(value: object): ReminderActions | null {
  if (
    !("reminder" in value) ||
    typeof value.reminder !== "object" ||
    value.reminder === null
  ) {
    return null;
  }
  const { reminder } = value;
  return "todoId" in reminder &&
    typeof reminder.todoId === "string" &&
    "done" in reminder &&
    typeof reminder.done === "string" &&
    "snooze" in reminder &&
    typeof reminder.snooze === "string" &&
    "failed" in reminder &&
    typeof reminder.failed === "string"
    ? {
        todoId: reminder.todoId,
        done: reminder.done,
        snooze: reminder.snooze,
        failed: reminder.failed,
      }
    : null;
}

function readPushMessage(data: PushMessageData | null): PushMessage {
  const fallback = {
    title: "Qi Assistant",
    body: "",
    url: "/",
    tag: "digest",
    reminder: null,
  };
  let value: unknown;
  try {
    value = data?.json();
  } catch {
    return fallback;
  }
  if (typeof value !== "object" || value === null) return fallback;
  const url = "url" in value && typeof value.url === "string" ? value.url : "";
  return {
    title:
      "title" in value && typeof value.title === "string"
        ? value.title
        : fallback.title,
    body:
      "body" in value && typeof value.body === "string"
        ? value.body
        : fallback.body,
    // Only a path of this app: a push never opens another site.
    url: url.startsWith("/") && !url.startsWith("//") ? url : fallback.url,
    tag:
      "tag" in value && typeof value.tag === "string"
        ? value.tag
        : fallback.tag,
    reminder: readReminder(value),
  };
}

// The DOM types of TypeScript do not have `actions` yet.
interface OptionsWithActions extends NotificationOptions {
  actions: { action: string; title: string }[];
}

self.addEventListener("push", (event) => {
  const { title, body, url, tag, reminder } = readPushMessage(event.data);
  const options: OptionsWithActions = {
    body,
    tag,
    data: { url, reminder },
    actions: reminder
      ? [
          { action: "done", title: reminder.done },
          { action: "snooze", title: reminder.snooze },
        ]
      : [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/** The request of a notification's button. The proxy accepts it: its Referer is this worker's URL. */
function requestAction(todoId: string, action: "done" | "snooze") {
  const path = `/api/todos/${encodeURIComponent(todoId)}`;
  const headers = { "Content-Type": "application/json" };
  return action === "done"
    ? fetch(path, {
        method: "PATCH",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ done: true }),
      })
    : fetch(`${path}/snooze`, {
        method: "POST",
        headers,
        credentials: "same-origin",
      });
}

/**
 * Runs a notification's button. A to-do that is gone needs nothing more. On a
 * failure the notification comes back to say so, and a tap on it opens the page.
 */
async function runReminderAction(
  { title, tag }: Notification,
  action: "done" | "snooze",
  reminder: ReminderActions,
  url: string,
) {
  const response = await requestAction(reminder.todoId, action).catch(
    () => null,
  );
  if (response?.ok || response?.status === 404) {
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const client of windows) client.postMessage(TODOS_CHANGED_MESSAGE);
    return;
  }
  await self.registration.showNotification(title, {
    body: reminder.failed,
    tag,
    data: { url, reminder: null },
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const value = typeof data === "object" && data !== null ? data : {};
  const path =
    "url" in value && typeof value.url === "string" ? value.url : "/";
  const reminder = readReminder(value);
  if (reminder && (event.action === "done" || event.action === "snooze")) {
    event.waitUntil(
      runReminderAction(event.notification, event.action, reminder, path),
    );
    return;
  }
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const open = windows.find((client) =>
          client.url.startsWith(self.location.origin),
        );
        if (open) {
          await open.focus();
          await open.navigate(target);
          return;
        }
        await self.clients.openWindow(target);
      }),
  );
});
