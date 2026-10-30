import { ShapesIcon } from "@phosphor-icons/react/dist/ssr/Shapes";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  color,
  controlSize,
  font,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { Link } from "#src/links/link.tsx";

/**
 * Title region of the design-system sidebar: a tile with the design-system
 * glyph, then the title. The whole block links to the overview.
 */
export function DesignSystemSidebarHeader({
  locale,
}: {
  locale: SupportedLocale;
}) {
  return (
    <Link
      href={getLocalePath("/design-system", locale)}
      {...stylex.props(flex.row, corner.radius_2, styles.block, a11y.focusRing)}
    >
      <span css={[flex.center, corner.radius_2, styles.tile]} aria-hidden>
        <ShapesIcon weight="bold" />
      </span>
      <span css={[typeRole.body, styles.title]}>
        {t({ en: "Design system", zh: "设计系统" })}
      </span>
    </Link>
  );
}

const styles = stylex.create({
  block: {
    gap: rhythm.tight,
    minInlineSize: 0,
    color: color.fg,
    textDecoration: "none",
  },
  tile: {
    flexShrink: 0,
    inlineSize: space._7,
    blockSize: space._7,
    fontSize: controlSize._4,
    color: color.bgSurface,
    backgroundColor: color.fg,
  },
  title: {
    minInlineSize: 0,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
