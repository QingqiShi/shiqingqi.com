import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { scrollX } from "#src/primitives/layout.stylex.ts";
import { transition } from "#src/primitives/motion.stylex.ts";
import {
  border,
  color,
  font,
  layer,
  shadow,
  space,
} from "#src/tokens.stylex.ts";

interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionNavItem[];
}

export function SectionNav({ sections }: SectionNavProps) {
  return (
    <nav css={styles.nav} aria-label="Design system sections">
      <div css={[flex.row, scrollX.base, styles.list]}>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            css={[transition.colors, styles.link]}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

const styles = stylex.create({
  nav: {
    position: "sticky",
    top: `calc(env(safe-area-inset-top) + ${space._10} + ${space._1})`,
    zIndex: layer.content,
    alignSelf: "flex-start",
    maxInlineSize: "100%",
    paddingBlock: space._1,
    paddingInline: space._1,
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_round,
    boxShadow: shadow._2,
  },
  list: {
    gap: space._1,
  },
  link: {
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
    },
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
});
