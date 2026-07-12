import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import {
  border,
  color,
  controlSize,
  font,
  space,
} from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { LocaleSelector } from "#src/components/shared/locale-selector.tsx";
import { ThemeSwitch } from "#src/components/shared/theme-switch.tsx";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

/**
 * Title region of the design-system sidebar: a home escape hatch (the shell
 * has no global header, so this is the only route back out) next to the
 * section title, which links to the design-system overview. The home link is
 * a quiet icon sized to match the shell's own icon buttons so the mobile pill
 * reads as one row of equal controls.
 */
export function DesignSystemSidebarHeader({
  locale,
}: {
  locale: SupportedLocale;
}) {
  return (
    <div css={[flex.row, styles.header]}>
      <Link
        href={getLocalePath("/", locale)}
        aria-label={t({ en: "Home", zh: "首页" })}
        css={[transition.colors, styles.homeLink]}
      >
        <HouseIcon weight="bold" role="presentation" />
      </Link>
      <Link href={getLocalePath("/design-system", locale)} css={styles.title}>
        {t({ en: "Design system", zh: "设计系统" })}
      </Link>
    </div>
  );
}

/**
 * Utility region pinned to the bottom of the design-system sidebar — the
 * theme toggle and language picker that header-driven pages get from the
 * fixed header chrome, sat side by side as compact icon controls above a
 * hairline divider.
 */
export function DesignSystemSidebarControls({
  locale,
}: {
  locale: SupportedLocale;
}) {
  return (
    <div css={[flex.row, styles.controls]}>
      <LocaleSelector
        size="sm"
        ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
        locale={locale}
        menuPosition="bottomLeft"
      />
      <ThemeSwitch
        size="sm"
        labels={[
          t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
          t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
          t({ en: "Switch to system theme", zh: "切换至系统颜色模式" }),
        ]}
      />
    </div>
  );
}

const styles = stylex.create({
  header: {
    gap: space._1,
    minInlineSize: 0,
  },
  homeLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    borderRadius: border.radius_round,
    fontSize: controlSize._4,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
  },
  title: {
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    color: color.textMain,
    textDecoration: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  controls: {
    gap: space._2,
    alignItems: "center",
    justifyContent: "space-between",
  },
});
