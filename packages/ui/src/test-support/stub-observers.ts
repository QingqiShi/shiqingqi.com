import { vi } from "vitest";

type ResizeCallback = (
  entries: { borderBoxSize: { inlineSize: number; blockSize: number }[] }[],
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
      disconnect() {
        resizeObservers.delete(this.#entry);
      }
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      #connected = false;
      observe() {
        if (!this.#connected) {
          this.#connected = true;
          intersectionObservers += 1;
        }
      }
      disconnect() {
        if (this.#connected) {
          this.#connected = false;
          intersectionObservers -= 1;
        }
      }
    },
  );
  return {
    resize(target: Element, inlineSize: number, blockSize: number) {
      for (const { callback, targets } of resizeObservers) {
        if (targets.has(target)) {
          callback([{ borderBoxSize: [{ inlineSize, blockSize }] }]);
        }
      }
    },
    /** How many resize observers watch `target`. */
    resizeObserversOf: (target: Element) =>
      [...resizeObservers].filter(({ targets }) => targets.has(target)).length,
    /** How many intersection observers are connected. */
    intersectionObservers: () => intersectionObservers,
  };
}
