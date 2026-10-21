import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { FinanceLogo } from "../pwa/finance-logo.tsx";

/** The title of the rail, a link to the Net worth screen. */
export function FinanceSidebarHeader({ locale }: { locale: SupportedLocale }) {
  return (
    <Link
      href={getLocalePath("/finance", locale)}
      {...stylex.props(typeRole.h4, styles.title, a11y.focusRing)}
    >
      <FinanceLogo css={styles.logo} />
      <span css={styles.name}>{t({ en: "Finance", zh: "家庭账本" })}</span>
    </Link>
  );
}

const styles = stylex.create({
  title: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    minInlineSize: 0,
    color: color.fg,
    textDecoration: "none",
  },
  logo: {
    flexShrink: 0,
    inlineSize: "1.4em",
    blockSize: "1.4em",
  },
  name: {
    minInlineSize: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
