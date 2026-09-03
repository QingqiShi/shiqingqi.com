/**
 * Matches the Phosphor "List" icon's metrics (256 viewBox, 16-unit
 * round-capped strokes, 1em box), so the built-in menu affordance needs no
 * icon dependency. Decorative — `SidebarLayout` supplies the accessible name
 * via `menuLabel`.
 *
 * @internal
 */
export function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M40 64h176M40 128h176M40 192h176"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}
