import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/**
 * The narrow column a page outside the shell sits in, under the Finance name:
 * sign-in, invites, and the not-found and error screens.
 */
export function FinanceFrame({
  brand,
  children,
}: {
  /** The Finance name, translated by the caller. */
  brand: string;
  children: ReactNode;
}) {
  return (
    <NavigationStack label={brand}>
      <div css={[stack.section, styles.column]}>
        <Text as="span" look="label" tone="muted">
          {brand}
        </Text>
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
});
