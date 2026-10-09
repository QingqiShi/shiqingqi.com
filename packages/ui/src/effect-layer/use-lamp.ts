import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LAMP = roleBits(["lamp"]);

/**
 * Makes an element a Lamp on the effect layer: attach the returned ref to
 * the element. While the lamp is on, a pool of light in the element's fill
 * colour spreads from its `::before` disc, the Switch's thumb, over the page
 * around it, and the other registered elements of its scope cast soft
 * shadows away from it. The lamp is on while the element is a checked
 * `<input>` that is not indeterminate, or has `aria-checked="true"`.
 * Turning it on swells the light up and past full before it settles;
 * turning it off lets it die away. The light follows the disc as it moves,
 * so it rides a drag, and the shadows swing with it. On a dark page the
 * light brightens the page; on a light page it tints it, and the shadows
 * darken it. Under reduced motion the light crosses from off to on with no
 * swell. Without a `::before` the light sits at the element's centre. The
 * element needs a box of its own, so not `display: contents`. Outside an
 * `EffectLayerProvider`, or where the effect layer is off, the ref does
 * nothing.
 */
export function useLamp() {
  return useEffectRegistration(LAMP, NO_SETTINGS);
}
