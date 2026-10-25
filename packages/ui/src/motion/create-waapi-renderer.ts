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

/**
 * Plays a motion as one Web Animation of sampled keyframes, so that a
 * transform or an opacity moves on the compositor with no script each frame.
 *
 * @internal
 */
export function createWaapiRenderer(element: Element): Renderer {
  let current: Animation | null = null;
  return {
    play(styleAt, start, end) {
      const length = end - start;
      const keyframes = sampleKeyframes(
        (seconds) => styleAt(start + seconds),
        length,
      ).map(({ offset, styles }) => keyframeOf(offset, styles));
      const next = element.animate(keyframes, {
        duration: length * 1000,
        easing: "linear",
        fill: "both",
      });
      next.startTime = start * 1000;
      // Start the new animation before the old one stops, so that no frame
      // shows the element with neither.
      current?.cancel();
      current = next;
    },
    stop() {
      current?.cancel();
      current = null;
    },
  };
}
