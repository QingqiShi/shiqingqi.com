import type { ComponentProps, PropsWithChildren } from "react";

interface FixturePanelProps {
  /** Whether the panel is open. */
  open?: boolean;
}

/** A panel that takes its children through `PropsWithChildren`. */
export function FixturePanel({
  open = false,
}: PropsWithChildren<FixturePanelProps>) {
  return String(open);
}

/** A wrapper that declares nothing of its own. */
export function FixturePassthrough(
  props: Omit<ComponentProps<"div">, "className">,
) {
  return String(props.id);
}
