/**
 * Matches the Phosphor "X" icon's metrics (256 viewBox, 16-unit round-capped
 * strokes, 1em box), so the built-in close affordance needs no icon
 * dependency. Decorative — the caller's own label prop supplies the
 * accessible name.
 *
 * @internal
 */
export function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M56 56 200 200M200 56 56 200"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}
