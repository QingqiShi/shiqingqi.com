import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { Link } from "#src/links/link.tsx";
import { FinanceLogo } from "../pwa/finance-logo.tsx";

/** The top of the rail: the Finance mark, a link to the Net worth screen. */
export function FinanceRailHeader({ locale }: { locale: SupportedLocale }) {
  return (
    <Link
      href={getLocalePath("/finance", locale)}
      aria-label={t({ en: "Finance", zh: "家庭账本" })}
      {...stylex.props(corner.radius_3, a11y.focusRing, styles.mark)}
    >
      <FinanceLogo css={styles.logo} />
    </Link>
  );
}

const styles = stylex.create({
  mark: {
    display: "inline-flex",
  },
  logo: {
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
  },
});
