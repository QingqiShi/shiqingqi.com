import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { SupportedLocale } from "@tuja/i18n/types";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { flex, justify } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import { CurrentYear } from "./current-year";

interface FooterProps {
  locale: SupportedLocale;
}

const BUILD_YEAR = new Date().getFullYear();

export function Footer({ locale }: FooterProps) {
  return (
    <footer css={[flex.wrap, justify.between, styles.footer]}>
      <div css={[stack.rows, styles.section, styles.linksSection]}>
        <Anchor
          href="https://github.com/QingqiShi"
          target="_blank"
          rel="nofollow me noopener noreferrer"
          css={[typeRole.label, a11y.touchRow, styles.link]}
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
          css={[typeRole.label, a11y.touchRow, styles.link]}
        >
          LinkedIn
        </Anchor>
      </div>
      <div css={[styles.section, styles.copyrightSection]}>
        <small>
          <span css={[typeRole.fluidH2, styles.name]}>
            {t({ en: "Qingqi Shi", zh: "石清琪" })}
          </span>
          <span css={[typeRole.fluidH3, styles.copyright]}>
            © <CurrentYear initialYear={BUILD_YEAR} />
          </span>
        </small>
      </div>
    </footer>
  );
}

const styles = stylex.create({
  footer: {
    paddingBottom: space._8,
    marginTop: rhythm.section,
    rowGap: rhythm.group,
  },
  section: {
    alignItems: { default: null, [breakpoints.md]: "center" },
  },
  linksSection: {
    alignItems: { default: "center", [breakpoints.md]: "flex-start" },
    width: { default: "100%", [breakpoints.md]: "50%" },
  },
  copyrightSection: {
    width: { default: "100%", [breakpoints.md]: "50%" },
    textAlign: { default: "center", [breakpoints.md]: "right" },
    justifyContent: { default: null, [breakpoints.md]: "flex-end" },
  },
  name: {
    display: "block",
  },
  copyright: {
    display: "block",
  },
  link: {
    display: "block",
    alignContent: "center",
    paddingBlock: space._0,
  },
});
