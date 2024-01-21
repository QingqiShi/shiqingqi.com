import * as stylex from "@stylexjs/stylex";
import type { Breakpoints, SupportedLocale } from "../types";
import { getTranslations } from "../app/translations/getTranslations";
import translations from "./translations.json";
import { Anchor } from "./anchor";

interface FooterProps {
  locale: SupportedLocale;
}

export function Footer({ locale }: FooterProps) {
  const { t } = getTranslations(translations, locale);
  return (
    <footer {...stylex.props(styles.footer)}>
      <div {...stylex.props(styles.section, styles.linksSection)}>
        <Anchor
          href="https://github.com/QingqiShi"
          target="_blank"
          rel="nofollow me noopener noreferrer"
          style={styles.link}
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
          style={styles.link}
        >
          LinkedIn
        </Anchor>
      </div>
      <div {...stylex.props(styles.section, styles.copyrightSection)}>
        <small>
          <span {...stylex.props(styles.name)}>{t("name")}</span>
          <span {...stylex.props(styles.copyright)}>© 2024</span>
        </small>
      </div>
    </footer>
  );
}

const minSm: Breakpoints["minSm"] = "@media (min-width: 320px)";
const minMd: Breakpoints["minMd"] = "@media (min-width: 768px)";

const styles = stylex.create({
  footer: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "3rem",
    marginTop: { default: "4rem", [minSm]: "7rem" },
  },
  section: {
    alignItems: { default: null, [minMd]: "center" },
  },
  linksSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: { default: "2rem", [minMd]: "0" },
    width: { default: "100%", [minMd]: "50%" },
    textAlign: { default: "center", [minMd]: "left" },
  },
  copyrightSection: {
    width: { default: "100%", [minMd]: "50%" },
    textAlign: { default: "center", [minMd]: "right" },
    justifyContent: { default: null, [minMd]: "flex-end" },
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
  },
});
