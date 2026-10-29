/** The Chromium event that lets a page show the browser's install dialog later. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function set(next: BeforeInstallPromptEvent | null) {
  deferred = next;
  for (const listener of listeners) listener();
}

// The browser can fire the event before React renders, and it does not fire
// it again in the same page load. Thus the module listens as soon as it loads.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    set(event);
  });
  window.addEventListener("appinstalled", () => {
    set(null);
  });
}

export const deferredInstallPrompt = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => deferred,
  getServer: () => null,
  /** Shows the browser's install dialog. A prompt event works only once. */
  show: () => {
    const event = deferred;
    if (!event) return;
    set(null);
    void event.prompt();
  },
};
