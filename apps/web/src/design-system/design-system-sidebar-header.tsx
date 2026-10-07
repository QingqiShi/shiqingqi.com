import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";

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
    <div css={[row.tight, styles.header]}>
      <Link
        href={getLocalePath("/", locale)}
        aria-label={t({ en: "Home", zh: "首页" })}
        {...stylex.props(
          transition.colors,
          corner.radius_round,
          styles.homeLink,
          a11y.focusRing,
        )}
      >
        <HouseIcon weight="bold" role="presentation" />
      </Link>
      <Link
        href={getLocalePath("/design-system", locale)}
        {...stylex.props(typeRole.h4, styles.title, a11y.focusRing)}
      >
        {t({ en: "Design system", zh: "设计系统" })}
      </Link>
    </div>
  );
}

const styles = stylex.create({
  header: {
    minInlineSize: 0,
  },
  homeLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: controlSize._4,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    backgroundColor: {
      default: "transparent",
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
  },
  title: {
    color: color.fg,
    textDecoration: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
