"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { FinanceLogo } from "../pwa/finance-logo.tsx";

/** The Finance mark at the end of the Settings menu below `md`, where the rail that shows it is hidden. */
export function SettingsFinanceLogo() {
  return (
    <div css={[stack.tight, styles.root]}>
      <FinanceLogo css={styles.logo} />
      <span css={[typeRole.label, styles.name]}>
        {t({ en: "Finance", zh: "家庭账本" })}
      </span>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: { default: "flex", [breakpoints.md]: "none" },
    alignItems: "center",
  },
  logo: {
    inlineSize: space._8,
    blockSize: space._8,
  },
  name: {
    color: color.fgMuted,
  },
});
