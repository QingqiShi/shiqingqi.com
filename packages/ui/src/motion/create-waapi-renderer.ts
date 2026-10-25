import type { FrameLoop } from "./create-frame-loop.ts";
import type { Renderer } from "./create-frame-renderer.ts";
import type { Styles } from "./px.ts";
import { sampleKeyframes } from "./sample-keyframes.ts";

/** The name that a keyframe takes for the CSS property `property`. */
function keyframeNameOf(property: string) {
  if (property.startsWith("--")) return property;
  if (property === "float") return "cssFloat";
  if (property === "offset") return "cssOffset";
  return property.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
}

function keyframeOf(offset: number, styles: Styles): Keyframe {
  const keyframe: Keyframe = { offset };
  for (const [property, style] of Object.entries(styles)) {
    keyframe[keyframeNameOf(property)] = style;
  }
  return keyframe;
}

function lengthOf(element: Element, name: string) {
  const style = getComputedStyle(element).getPropertyValue(name).trim();
  const match = /^(-?[\d.]+)(px|r?em)$/.exec(style);
  if (match === null) return null;
  const size = Number.parseFloat(match[1]);
  if (match[2] === "px") return size;
  const fontOf = match[2] === "rem" ? document.documentElement : element;
  return size * (Number.parseFloat(getComputedStyle(fontOf).fontSize) || 16);
}

function constantsOf(samples: readonly { readonly styles: Styles }[]): Styles {
  const [first, ...rest] = samples;
  return Object.fromEntries(
    Object.entries(first.styles).filter(([property, style]) =>
      rest.every((sample) => sample.styles[property] === style),
    ),
  );
}

/**
 * The properties that a browser can move on the compositor. An animation
 * that also has another property moves on the main thread, so each other
 * property plays in an animation of its own.
 */
const COMPOSITED = new Set([
  "transform",
  "translate",
  "rotate",
  "scale",
  "opacity",
  "filter",
]);

/** The properties of `samples` that change, in the groups that each play as one animation. */
function groupsOf(
  samples: readonly { readonly styles: Styles }[],
  constants: Styles,
) {
  const changing = Object.keys(samples[0].styles).filter(
    (property) => !(property in constants),
  );
  return [
    changing.filter((property) => COMPOSITED.has(property)),
    changing.filter((property) => !COMPOSITED.has(property)),
  ].filter((group) => group.length > 0);
}

/**
 * Plays a motion as Web Animations of sampled keyframes, so that a
 * transform or an opacity moves on the compositor with no script each frame.
 * A property that keeps one value over the motion goes inline with `write`,
 * as not every browser animates each property. The clock of `loop` sets
 * when the animations start. Each play in one task makes its animations at
 * the end of the task, from the last play.
 *
 * @internal
 */
export function createWaapiRenderer(
  element: Element,
  loop: FrameLoop,
  write: (styles: Styles) => void,
): Renderer {
  let current: { animation: Animation; stop: () => void }[] = [];
  let next: Parameters<Renderer["play"]> | null = null;

  function cancel() {
    for (const { animation, stop } of current) {
      animation.cancel();
      stop();
    }
    current = [];
  }

  function animate(...[styleAt, start, end]: Parameters<Renderer["play"]>) {
    const length = end - start;
    const samples = sampleKeyframes(
      (seconds) => styleAt(start + seconds),
      length,
      (name) => lengthOf(element, name),
    );
    const constants = constantsOf(samples);
    write(constants);
    const played = groupsOf(samples, constants).map((group) => {
      const keyframes = samples.map(({ offset, styles }) =>
        keyframeOf(
          offset,
          Object.fromEntries(
            group.map((property) => [property, styles[property]]),
          ),
        ),
      );
      const animation = element.animate(keyframes, {
        duration: length * 1000,
        easing: "linear",
        fill: "both",
      });
      return { animation, stop: loop.sync(animation, start, end) };
    });
    // Start the new animations before the old ones stop, so that no frame
    // shows the element with neither.
    cancel();
    current = played;
  }

  return {
    play(...args) {
      if (next === null) {
        queueMicrotask(() => {
          if (next === null) return;
          const last = next;
          next = null;
          animate(...last);
        });
      }
      next = args;
    },
    stop() {
      next = null;
      cancel();
    },
  };
}
