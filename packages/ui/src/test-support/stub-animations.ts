/**
 * A Web Animation as `stubAnimations` records it.
 *
 * @internal
 */
export interface StubAnimation {
  readonly target: Element;
  readonly keyframes: readonly Keyframe[];
  readonly options: KeyframeAnimationOptions;
  startTime: number | null;
  cancelled: boolean;
  /** Resolves when the browser starts the animation. */
  readonly ready: Promise<StubAnimation>;
  cancel(): void;
}

/**
 * Gives jsdom an `Element.prototype.animate` that records each animation,
 * and logs each start and each cancel in order, as `"play 0"` or
 * `"cancel 0"` by the index in `animations`. As a browser, it starts each
 * animation that has no start time on the next microtask, at the time of
 * then, or, with `startByHand`, only on `start`. Call `restore` after the
 * test.
 *
 * @internal
 */
export function stubAnimations({ startByHand = false } = {}) {
  const animations: StubAnimation[] = [];
  const log: string[] = [];
  const starts = new Map<StubAnimation, () => void>();
  Object.assign(Element.prototype, {
    animate(
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const index = animations.length;
      let start: (animation: StubAnimation) => void = () => {};
      const ready = new Promise<StubAnimation>((resolve) => {
        start = resolve;
      });
      const animation: StubAnimation = {
        target: this,
        keyframes: Array.isArray(keyframes) ? keyframes : [],
        options: typeof options === "object" ? options : {},
        startTime: null,
        cancelled: false,
        ready,
        cancel() {
          animation.cancelled = true;
          log.push(`cancel ${String(index)}`);
        },
      };
      animations.push(animation);
      log.push(`play ${String(index)}`);
      starts.set(animation, () => {
        animation.startTime ??= performance.now();
        start(animation);
      });
      if (!startByHand) queueMicrotask(() => starts.get(animation)?.());
      return animation;
    },
  });
  return {
    animations,
    log,
    /** The animations on `target` that are not cancelled. */
    running: (target: Element) =>
      animations.filter(
        (animation) => animation.target === target && !animation.cancelled,
      ),
    /** Starts `animation`, which has no start time, at `time` ms, as a browser that shows its first frame then. */
    start(animation: StubAnimation, time: number) {
      animation.startTime ??= time;
      starts.get(animation)?.();
    },
    restore() {
      Reflect.deleteProperty(Element.prototype, "animate");
    },
  };
}
