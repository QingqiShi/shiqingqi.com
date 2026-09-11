import type { ComponentProps, ReactNode } from "react";

type FixtureTone = "quiet" | "loud";

interface FixtureControlBaseProps extends Omit<
  ComponentProps<"button">,
  "children" | "className" | "onChange"
> {
  /**
   * Height scale. Defaults to `"md"`.
   *
   * A second paragraph, to prove paragraph breaks survive.
   * @zh 高度阶梯。
   */
  size?: "sm" | "md" | "lg";
  /**
   * Foreground role, named through an alias.
   *
   * @zh 通过别名命名的前景角色，`tone` 保持不变。
   */
  tone?: FixtureTone;
  /** Lifts the control onto a bright surface. */
  bright?: boolean;
  /** How many steps one arrow key moves. */
  step?: number;
  /** Text shown when nothing is selected. */
  placeholder?: string;
  /** Decorative leading icon. */
  icon?: ReactNode;
  /** Called with the next value. */
  onChange?: (next: string) => void;
  /**
   * The old name for `tone`.
   * @deprecated Use `tone` instead.
   */
  shade?: FixtureTone;
  /**
   * Which corner the popup grows from.
   * @default "topRight"
   */
  position?: "topLeft" | "topRight";
  /** StyleX styles merged over the control's own. */
  css?: unknown;
}

interface FixtureControlCountProps {
  /** How many items the control reports. */
  count: number;
}

type FixtureControlProps = FixtureControlBaseProps &
  FixtureControlCountProps &
  ({ children: ReactNode } | { children?: undefined; "aria-label": string });

/** A control that exercises every prop shape the codegen must read. */
export function FixtureControl({
  size = "md",
  tone = "quiet",
  position = "topLeft",
  count,
}: FixtureControlProps) {
  return `${size}${tone}${position}${String(count)}`;
}
