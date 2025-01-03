import * as stylex from "@stylexjs/stylex";
import { getTranslations } from "@/app/translations/getTranslations";
import { breakpoints } from "@/breakpoints";
import type { SupportedLocale } from "@/types";
import { Anchor } from "./anchor";
import translations from "./translations.json";

interface FooterProps {
  locale: SupportedLocale;
}

export function Footer({ locale }: FooterProps) {
  const { t } = getTranslations(translations, locale);
  return (
    <footer css={styles.footer}>
      <div css={[styles.section, styles.linksSection]}>
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
          <span css={styles.name}>{t("name")}</span>
          <span css={styles.copyright}>© 2024</span>
        </small>
      </div>
    </footer>
  );
}

const styles = stylex.create({
  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "3rem",
    marginTop: { default: "4rem", [breakpoints.sm]: "7rem" },
  },
  section: {
    alignItems: { default: null, [breakpoints.md]: "center" },
  },
  linksSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: { default: "2rem", [breakpoints.md]: "0" },
    width: { default: "100%", [breakpoints.md]: "50%" },
    textAlign: { default: "center", [breakpoints.md]: "left" },
  },
  copyrightSection: {
    width: { default: "100%", [breakpoints.md]: "50%" },
    textAlign: { default: "center", [breakpoints.md]: "right" },
    justifyContent: { default: null, [breakpoints.md]: "flex-end" },
  },
  name: {
    display: "block",
    fontWeight: 800,
    fontSize: "1.5rem",
  },
  copyright: {
    display: "block",
    fontWeight: 800,
    fontSize: "1.2rem",
  },
  link: {
    display: "block",
    fontSize: "0.8rem",
    marginBottom: { default: null, ":not(:last-of-type)": "0.2rem" },
    paddingBlock: { default: "0.5rem", [breakpoints.md]: "0" },
  },
});
