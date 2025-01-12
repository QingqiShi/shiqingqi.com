import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { font, space } from "@/tokens.stylex";
import { getTranslations } from "@/utils/get-translations";
import { getRequestLocale } from "@/utils/request-locale";
import { Anchor } from "../shared/anchor";
import translations from "./translations.json";

export async function Footer() {
  const locale = await getRequestLocale();
  const { t } = getTranslations(translations, locale);

  const currentYear = new Date().getFullYear();

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
          <span css={styles.copyright}>© {currentYear}</span>
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
    paddingBottom: space._8,
    marginTop: { default: space._9, [breakpoints.sm]: space._11 },
  },
  section: {
    alignItems: { default: null, [breakpoints.md]: "center" },
  },
  linksSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: { default: "center", [breakpoints.md]: "flex-start" },
    marginBottom: { default: space._7, [breakpoints.md]: "0" },
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
    fontSize: font.size_4,
  },
  copyright: {
    display: "block",
    fontWeight: font.weight_8,
    fontSize: font.size_3,
  },
  link: {
    display: "block",
    fontSize: font.size_0,
    marginBottom: { default: null, ":not(:last-of-type)": space._0 },
    paddingBlock: { default: space._1, [breakpoints.md]: "0" },
  },
});
