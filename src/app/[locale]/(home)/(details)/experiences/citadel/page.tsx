import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";
import { DetailPageTitle } from "@/components/home/detail-page-title";
import CitadelLogo from "@/logos/citadel-logo";
import { color, font, space } from "@/tokens.stylex";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <DetailPageTitle
        type="experience"
        title="Citadel"
        role={t("role")}
        date={t("date")}
        locale={params.locale}
        logo={<CitadelLogo />}
      />
      <div css={styles.container}>
        <section css={styles.fullWidthSection}>
          <p css={styles.text}>{t("responsibilities")}</p>
        </section>

        <section css={styles.section}>
          <h3 css={styles.sectionTitle}>{t("techStack")}</h3>
          <ul css={styles.list}>
            <li css={styles.listItem}>React</li>
            <li css={styles.listItem}>TypeScript</li>
            <li css={styles.listItem}>AG Grid</li>
          </ul>
        </section>
      </div>
    </>
  );
}

const styles = stylex.create({
  container: {
    display: "grid",
    gap: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, 1fr)",
      [breakpoints.lg]: "repeat(3, 1fr)",
    },
  },
  fullWidthSection: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    gridColumn: {
      default: "1",
      [breakpoints.md]: "1 / -1",
    },
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  sectionTitle: {
    color: color.textMain,
    fontSize: {
      default: font.size_2,
      [breakpoints.md]: font.size_3,
    },
    fontWeight: font.weight_7,
    margin: 0,
  },
  text: {
    color: color.textMuted,
    fontSize: font.size_1,
    lineHeight: font.lineHeight_4,
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  listItem: {
    color: color.textMuted,
    fontSize: font.size_1,
    lineHeight: font.lineHeight_4,
    paddingLeft: space._3,
    position: "relative",
    "::before": {
      content: '"•"',
      color: color.textMuted,
      fontWeight: font.weight_7,
      position: "absolute",
      left: 0,
    },
  },
});
