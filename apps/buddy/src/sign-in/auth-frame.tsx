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

/** The narrow column that the owner's pages sit in, under the wordmark that leads home: sign-in, sign-up, recovery, connect and the Macs list. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <NavigationStack label={t({ en: "Buddy", zh: "搭子" })}>
      <div css={[stack.section, styles.column]}>
        <Link
          href={getLocalePath("/", getLocale())}
          {...stylex.props(a11y.focusRing, typeRole.label, styles.brand)}
        >
          {t({ en: "Buddy", zh: "搭子" })}
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
