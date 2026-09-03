import { IconSvg } from "./icon-svg.tsx";

type ChevronDirection =
  "block-start" | "block-end" | "inline-start" | "inline-end";

interface ChevronIconProps {
  direction: ChevronDirection;
}

const paths: Record<ChevronDirection, string> = {
  "block-start": "M48 160l80-80 80 80",
  "block-end": "M208 96l-80 80-80-80",
  "inline-start": "M160 208l-80-80 80-80",
  "inline-end": "M96 48l80 80-80 80",
};

/**
 * Inline chevron matching Phosphor "Caret" metrics, aimed by `direction`.
 * Decorative — hosts render it inside an `aria-hidden` wrapper.
 *
 * @internal
 */
export function ChevronIcon({ direction }: ChevronIconProps) {
  return (
    <IconSvg>
      <path
        d={paths[direction]}
        stroke="currentColor"
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  );
}
