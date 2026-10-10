import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { SyncStatusIndicator } from "./sync-status-indicator.tsx";

/** The title of the rail and the mobile bar, with the sync status when it has news. */
export function FinanceSidebarHeader({ locale }: { locale: SupportedLocale }) {
  return (
    <div css={[row.tight, styles.header]}>
      <Link
        href={getLocalePath("/finance", locale)}
        {...stylex.props(typeRole.h4, styles.title, a11y.focusRing)}
      >
        {t({ en: "Finance", zh: "家庭账本" })}
      </Link>
      <SyncStatusIndicator compact />
    </div>
  );
}

const styles = stylex.create({
  header: {
    minInlineSize: 0,
  },
  title: {
    color: color.fg,
    textDecoration: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
