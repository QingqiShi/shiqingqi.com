import * as stylex from "@stylexjs/stylex";
import { Link } from "@tuja/next-links/link";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/**
 * The narrow column under the wordmark that leads home. It takes its copy as
 * props, so the error screen, which has no translations, can use it too.
 */
export function BuddyFrame({
  brand,
  homeHref,
  children,
}: {
  /** The app name, translated by the caller. */
  brand: string;
  homeHref: string;
  children: ReactNode;
}) {
  return (
    <NavigationStack label={brand}>
      <div css={[stack.section, styles.column]}>
        <Link
          href={homeHref}
          {...stylex.props(a11y.focusRing, typeRole.label, styles.brand)}
        >
          {brand}
        </Link>
        {children}
      </div>
    </NavigationStack>
  );
}

const styles = stylex.create({
  // Under the top of the screen, as a page with no way back has nothing there.
  column: {
    inlineSize: "100%",
    maxInlineSize: space._15,
    marginInline: "auto",
    paddingBlockStart: { default: space._7, [breakpoints.md]: space._10 },
  },
  brand: {
    alignSelf: "flex-start",
    fontWeight: font.weight_6,
    color: color.mutedForeground,
    textDecoration: "none",
  },
});
