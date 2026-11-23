import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Link } from "@tuja/next-links/link";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/** The narrow column of sign-in, sign-up and recovery, under the wordmark that leads home. */
export function AuthFrame({ children }: { children: ReactNode }) {
  const brand = t({ en: "Paper Fund", zh: "模拟基金" });
  return (
    <NavigationStack label={brand}>
      <div css={[stack.section, styles.column]}>
        <Link
          href={getLocalePath("/", getLocale())}
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
