import * as stylex from "@stylexjs/stylex";
import { flex } from "#src/primitives/flex.stylex.ts";
import { scrollX } from "#src/primitives/layout.stylex.ts";
import { transition } from "#src/primitives/motion.stylex.ts";
import {
  border,
  color,
  controlSize,
  font,
  layer,
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
    top: `calc(env(safe-area-inset-top) + ${space._10} + ${controlSize._9})`,
    zIndex: layer.content,
    marginInline: `calc(${space._3} * -1)`,
    paddingInline: space._3,
    paddingBlock: space._2,
    backgroundColor: `rgba(${color.backgroundMainChannels}, 0.7)`,
    backdropFilter: "saturate(180%) blur(20px)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: color.borderSubtle,
  },
  list: {
    gap: space._3,
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
      ":hover": color.surfaceAccentSubtle,
    },
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
});
