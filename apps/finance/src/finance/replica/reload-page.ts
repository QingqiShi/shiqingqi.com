const UPDATE_WAIT_MS = 5_000;

interface ServiceWorkers {
  getRegistration(): Promise<
    | {
        installing:
          (EventTarget & { readonly state: ServiceWorkerState }) | null;
        waiting: (EventTarget & { readonly state: ServiceWorkerState }) | null;
        update(): Promise<unknown>;
      }
    | undefined
  >;
}

async function activateUpdate(container: ServiceWorkers) {
  const registration = await container.getRegistration();
  if (!registration) return;
  await registration.update();
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return;
  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (worker.state !== "activated" && worker.state !== "redundant") return;
      worker.removeEventListener("statechange", onStateChange);
      resolve();
    };
    worker.addEventListener("statechange", onStateChange);
    onStateChange();
  });
}

/**
 * Asks the service worker to update, and waits up to `waitMs` for a new
 * worker to activate. A new worker deletes the stored Finance pages of the
 * old build, so the reload that follows cannot fall back to old code.
 */
export async function updateServiceWorker(
  container: ServiceWorkers | undefined,
  waitMs = UPDATE_WAIT_MS,
) {
  if (!container) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    activateUpdate(container).catch(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, waitMs);
    }),
  ]);
  clearTimeout(timer);
}

/**
 * Gets the newest code: updates the service worker, then reloads the page,
 * unless `confirm` says no after the wait. Resolves whether it reloads.
 */
export async function reloadPage(confirm: () => boolean = () => true) {
  await updateServiceWorker(
    "serviceWorker" in navigator ? navigator.serviceWorker : undefined,
  );
  if (!confirm()) return false;
  window.location.reload();
  return true;
}
