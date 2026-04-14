"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, space } from "#src/tokens.stylex.ts";
import { AnchorButton } from "../shared/anchor-button";
import {
  DATA_HERO_COLLAPSED_BUTTON,
  useHeroVisibility,
} from "./hero-visibility-context";

interface CollapsedChatButtonProps {
  aiModeHref: string;
  label: string;
  ariaLabel: string;
}

export function CollapsedChatButton({
  aiModeHref,
  label,
  ariaLabel,
}: CollapsedChatButtonProps) {
  const { isHeroInputVisible } = useHeroVisibility();

  return (
    <div
      css={[
        styles.container,
        isHeroInputVisible ? styles.hidden : styles.visible,
      ]}
      aria-hidden={isHeroInputVisible || undefined}
      {...{ [DATA_HERO_COLLAPSED_BUTTON]: "" }}
    >
      <AnchorButton
        href={aiModeHref}
        aria-label={ariaLabel}
        tabIndex={isHeroInputVisible ? -1 : undefined}
        icon={
          <span css={[flex.inlineCenter, styles.icon]}>
            <SparkleIcon weight="fill" role="presentation" />
          </span>
        }
      >
        {label}
      </AnchorButton>
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: { default: "flex", [breakpoints.md]: "none" },
    willChange: "transform, opacity",
    position: "absolute",
    insetBlockStart: 0,
    insetBlockEnd: 0,
    insetInlineEnd: `calc(${space._3} + env(safe-area-inset-right, 0px) + var(--removed-body-scroll-bar-size, 0px))`,
    alignItems: "center",
  },
  visible: {
    opacity: 1,
    pointerEvents: "auto",
  },
  hidden: {
    opacity: 0,
    pointerEvents: "none",
  },
  icon: {
    color: color.controlActive,
  },
});
