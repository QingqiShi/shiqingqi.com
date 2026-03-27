import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { t } from "#src/i18n.ts";
import { flex, align, justify } from "#src/primitives/flex.stylex.ts";
import { text, weight } from "#src/primitives/text.stylex.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { Anchor } from "../shared/anchor";

interface FooterProps {
  locale: SupportedLocale;
}

export function Footer({ locale }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer css={[flex.wrap, justify.between, align.center, styles.footer]}>
      <div css={[flex.col, styles.section, styles.linksSection]}>
        <Anchor
          href="https://github.com/QingqiShi"
          target="_blank"
          rel="nofollow me noopener noreferrer"
          css={[text.bodySmall, styles.link]}
        >
          GitHub
        </Anchor>
        <Anchor
          href={
            locale === "zh"
              ? "https://www.linkedin.com/in/qingqi-shi/?locale=zh_CN"
              : "https://www.linkedin.com/in/qingqi-shi/"
          }
          target="_blank"
          rel="nofollow me noopener noreferrer"
          css={[text.bodySmall, styles.link]}
        >
          LinkedIn
        </Anchor>
      </div>
      <div css={[styles.section, styles.copyrightSection]}>
        <small>
          <span css={[text.heading2, weight._8, styles.block]}>
            {t({ en: "Qingqi Shi", zh: "石清琪" })}
          </span>
          <span css={[text.heading3, weight._8, styles.block]}>
            © {currentYear}
          </span>
        </small>
      </div>
    </footer>
  );
}

const styles = stylex.create({
  footer: {
    paddingBottom: space._8,
    marginTop: { default: space._9, [breakpoints.sm]: space._11 },
  },
  section: {
    alignItems: { default: null, [breakpoints.md]: "center" },
  },
  linksSection: {
    alignItems: { default: "center", [breakpoints.md]: "flex-start" },
    marginBottom: { default: space._7, [breakpoints.md]: 0 },
    width: { default: "100%", [breakpoints.md]: "50%" },
  },
  copyrightSection: {
    width: { default: "100%", [breakpoints.md]: "50%" },
    textAlign: { default: "center", [breakpoints.md]: "right" },
    justifyContent: { default: null, [breakpoints.md]: "flex-end" },
  },
  block: {
    display: "block",
  },
  link: {
    display: "block",
    marginBottom: { default: null, ":not(:last-of-type)": space._0 },
    paddingBlock: { default: space._1, [breakpoints.md]: 0 },
  },
});
