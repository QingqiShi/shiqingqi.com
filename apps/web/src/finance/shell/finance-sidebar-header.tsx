import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";

/** The title of the rail, a link to the Net worth screen. */
export function FinanceSidebarHeader({ locale }: { locale: SupportedLocale }) {
  return (
    <Link
      href={getLocalePath("/finance", locale)}
      {...stylex.props(typeRole.h4, styles.title, a11y.focusRing)}
    >
      {t({ en: "Finance", zh: "家庭账本" })}
    </Link>
  );
}

const styles = stylex.create({
  title: {
    display: "block",
    minInlineSize: 0,
    color: color.fg,
    textDecoration: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
