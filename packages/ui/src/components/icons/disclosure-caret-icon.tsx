import { IconSvg } from "./icon-svg.tsx";

/**
 * The default `Disclosure` indicator. Same 256 viewBox and round-capped stroke
 * recipe as Callout's icons, so a caller can swap in a Phosphor icon without a
 * size jump.
 *
 * @internal
 */
export function DisclosureCaretIcon() {
  return (
    <IconSvg>
      <path
        d="M208 96 128 176 48 96"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  );
}
