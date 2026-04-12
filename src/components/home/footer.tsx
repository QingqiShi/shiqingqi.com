import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { t } from "#src/i18n.ts";
import { flex, justify } from "#src/primitives/flex.stylex.ts";
import { font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { Anchor } from "../shared/anchor";
import { CurrentYear } from "./current-year";

interface FooterProps {
  locale: SupportedLocale;
}

export function Footer({ locale }: FooterProps) {
  return (
    <footer css={[flex.wrap, justify.between, styles.footer]}>
      <div css={[flex.col, styles.section, styles.linksSection]}>
        <Anchor
          href="https://github.com/QingqiShi"
          target="_blank"
          rel="nofollow me noopener noreferrer"
          css={styles.link}
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
          css={styles.link}
        >
          LinkedIn
        </Anchor>
      </div>
      <div css={[styles.section, styles.copyrightSection]}>
        <small>
          <span css={styles.name}>{t({ en: "Qingqi Shi", zh: "石清琪" })}</span>
          <span css={styles.copyright}>
            © <CurrentYear />
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
  name: {
    display: "block",
    fontWeight: font.weight_8,
    fontSize: font.vpHeading2,
  },
  copyright: {
    display: "block",
    fontWeight: font.weight_8,
    fontSize: font.vpHeading3,
  },
  link: {
    display: "block",
    fontSize: font.uiBodySmall,
    marginBottom: { default: null, ":not(:last-of-type)": space._0 },
    paddingBlock: { default: space._1, [breakpoints.md]: 0 },
  },
});
