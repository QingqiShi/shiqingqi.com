import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { AssistantLogo } from "../pwa/assistant-logo.tsx";

/**
 * The narrow column a page outside the shell sits in, under the app's mark
 * and name: the public home, sign-in, the legal pages, and the not-found and
 * error screens.
 */
export function AssistantFrame({
  brand,
  children,
}: {
  /** The app name, translated by the caller. */
  brand: string;
  children: ReactNode;
}) {
  return (
    <NavigationStack label={brand}>
      <div css={[stack.section, styles.column]}>
        <div css={row.tight}>
          <AssistantLogo css={styles.logo} />
          <Text as="span" look="control" weight="semibold">
            {brand}
          </Text>
        </div>
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
  logo: {
    flexShrink: 0,
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
  },
});
