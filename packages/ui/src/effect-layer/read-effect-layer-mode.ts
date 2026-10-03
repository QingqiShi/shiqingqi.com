/**
 * How the effect layer runs on this page load: `?effects=off` or the
 * `effect-layer` localStorage key set to `off` turns it off, and
 * `?effects=debug` shows the debug view.
 *
 * @internal
 */
export function readEffectLayerMode(): "on" | "off" | "debug" {
  const query = new URLSearchParams(window.location.search).get("effects");
  if (query === "off" || query === "debug") {
    return query;
  }
  try {
    if (window.localStorage.getItem("effect-layer") === "off") {
      return "off";
    }
  } catch {
    // Storage can be blocked. Then only the query can turn the layer off.
  }
  return "on";
}
