import { vi } from "vitest";

type ResizeCallback = (
  entries: {
    target: Element;
    borderBoxSize: { inlineSize: number; blockSize: number }[];
  }[],
) => void;

/**
 * Stands in for `ResizeObserver` and `IntersectionObserver`, which jsdom
 * does not have. `resize(target, size)` calls each resize observer of
 * `target` with its new border box size.
 * Call `vi.unstubAllGlobals()` after the test.
 *
 * @internal
 */
export function stubObservers() {
  const resizeObservers = new Set<{
    callback: ResizeCallback;
    targets: Set<Element>;
  }>();
  let intersectionObservers = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      readonly #entry: { callback: ResizeCallback; targets: Set<Element> } = {
        callback: () => {},
        targets: new Set(),
      };
      constructor(callback: ResizeCallback) {
        this.#entry.callback = callback;
        resizeObservers.add(this.#entry);
      }
      observe(target: Element) {
        this.#entry.targets.add(target);
      }
      unobserve(target: Element) {
        this.#entry.targets.delete(target);
      }
      disconnect() {
        resizeObservers.delete(this.#entry);
      }
    },
  );
  const intersectionCallbacks = new Map<
    () => void,
    { targets: Set<Element>; root: Element | null }
  >();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      #connected = false;
      readonly #callback: () => void;
      readonly #targets = new Set<Element>();
      readonly #root: Element | null;
      constructor(
        callback: (entries: []) => void,
        options?: { root?: Element | null },
      ) {
        this.#callback = () => {
          callback([]);
        };
        this.#root = options?.root ?? null;
      }
      observe(target: Element) {
        this.#targets.add(target);
        if (!this.#connected) {
          this.#connected = true;
          intersectionObservers += 1;
          intersectionCallbacks.set(this.#callback, {
            targets: this.#targets,
            root: this.#root,
          });
        }
      }
      disconnect() {
        if (this.#connected) {
          this.#connected = false;
          intersectionObservers -= 1;
          intersectionCallbacks.delete(this.#callback);
        }
      }
    },
  );
  return {
    resize(target: Element, inlineSize: number, blockSize: number) {
      for (const { callback, targets } of resizeObservers) {
        if (targets.has(target)) {
          callback([{ target, borderBoxSize: [{ inlineSize, blockSize }] }]);
        }
      }
    },
    /** How many resize observers watch `target`. */
    resizeObserversOf: (target: Element) =>
      [...resizeObservers].filter(({ targets }) => targets.has(target)).length,
    /** How many intersection observers are connected. */
    intersectionObservers: () => intersectionObservers,
    /**
     * Calls each connected intersection observer of `target`, with no
     * entries.
     */
    intersect(target: Element) {
      for (const [callback, { targets }] of [...intersectionCallbacks]) {
        if (targets.has(target)) {
          callback();
        }
      }
    },
    /**
     * The root of each connected intersection observer of `target`: an
     * element, or `null` for the viewport.
     */
    intersectionRootsOf: (target: Element) =>
      [...intersectionCallbacks.values()].flatMap(({ targets, root }) =>
        targets.has(target) ? [root] : [],
      ),
  };
}
