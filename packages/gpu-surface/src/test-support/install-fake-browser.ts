import { onTestFinished, vi } from "vitest";

// jsdom has no WebGL, no `matchMedia`, and no `ResizeObserver`. These stand
// in for the browser, never for the runtime's own code.

export interface FakeWebGl2 {
  /** The colour of each `clear()`, with the buffer size at that time. */
  clears: { rgba: number[]; width: number; height: number }[];
  readonly lost: boolean;
  /** Takes the context away, as the browser does. Returns the event. */
  loseContext(): Event;
  restoreContext(): void;
}

class FakeMediaQueryList extends EventTarget {
  readonly media: string;
  matches = false;

  constructor(media: string) {
    super();
    this.media = media;
  }

  change(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

function fakeWebGl2(canvas: HTMLCanvasElement, contexts: FakeWebGl2[]) {
  let lost = false;
  let clearColor = [0, 0, 0, 0];
  const fake: FakeWebGl2 = {
    clears: [],
    get lost() {
      return lost;
    },
    loseContext() {
      lost = true;
      const event = new Event("webglcontextlost", { cancelable: true });
      canvas.dispatchEvent(event);
      return event;
    },
    restoreContext() {
      lost = false;
      canvas.dispatchEvent(new Event("webglcontextrestored"));
    },
  };
  contexts.push(fake);
  const loseContextExtension = {
    loseContext: () => fake.loseContext(),
    restoreContext: () => {
      fake.restoreContext();
    },
  };
  return {
    COLOR_BUFFER_BIT: 0x4000,
    get drawingBufferWidth() {
      return canvas.width;
    },
    get drawingBufferHeight() {
      return canvas.height;
    },
    isContextLost: () => lost,
    getExtension: (name: string) =>
      name === "WEBGL_lose_context" ? loseContextExtension : null,
    viewport: () => undefined,
    clearColor: (r: number, g: number, b: number, a: number) => {
      clearColor = [r, g, b, a];
    },
    clear: () => {
      fake.clears.push({
        rgba: clearColor,
        width: canvas.width,
        height: canvas.height,
      });
    },
  };
}

/** Gives jsdom a WebGL2 context, media queries, and resize observers for one test. */
export function installFakeBrowser() {
  const contexts: FakeWebGl2[] = [];
  const prototype = HTMLCanvasElement.prototype;
  const getContext = Object.getOwnPropertyDescriptor(prototype, "getContext");
  Object.defineProperty(prototype, "getContext", {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      return type === "webgl2" ? fakeWebGl2(this, contexts) : null;
    },
  });
  onTestFinished(() => {
    if (getContext) Object.defineProperty(prototype, "getContext", getContext);
  });

  const lists: FakeMediaQueryList[] = [];
  vi.stubGlobal("matchMedia", (media: string) => {
    const list = new FakeMediaQueryList(media);
    lists.push(list);
    return list;
  });

  const observers: { callback: () => void; connected: boolean }[] = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      #entry: { callback: () => void; connected: boolean };
      constructor(callback: () => void) {
        this.#entry = { callback, connected: false };
        observers.push(this.#entry);
      }
      observe() {
        this.#entry.connected = true;
      }
      disconnect() {
        this.#entry.connected = false;
      }
    },
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });

  return {
    context() {
      const context = contexts.at(0);
      if (context === undefined) throw new Error("no WebGL2 context");
      return context;
    },
    /** The last list created for this query. */
    mediaQuery(media: string) {
      const list = lists.findLast((candidate) => candidate.media === media);
      if (list === undefined) throw new Error(`no list for ${media}`);
      return list;
    },
    /** Runs every connected resize observer, as a layout change does. */
    resize() {
      for (const observer of observers) {
        if (observer.connected) observer.callback();
      }
    },
  };
}

export function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}
