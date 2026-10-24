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
  cancel(): void;
}

/**
 * Gives jsdom an `Element.prototype.animate` that records each animation,
 * and logs each start and each cancel in order, as `"play 0"` or
 * `"cancel 0"` by the index in `animations`. Call `restore` after the test.
 *
 * @internal
 */
export function stubAnimations() {
  const animations: StubAnimation[] = [];
  const log: string[] = [];
  Object.assign(Element.prototype, {
    animate(
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const index = animations.length;
      const animation: StubAnimation = {
        target: this,
        keyframes: Array.isArray(keyframes) ? keyframes : [],
        options: typeof options === "object" ? options : {},
        startTime: null,
        cancelled: false,
        cancel() {
          animation.cancelled = true;
          log.push(`cancel ${String(index)}`);
        },
      };
      animations.push(animation);
      log.push(`play ${String(index)}`);
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
    restore() {
      Reflect.deleteProperty(Element.prototype, "animate");
    },
  };
}
