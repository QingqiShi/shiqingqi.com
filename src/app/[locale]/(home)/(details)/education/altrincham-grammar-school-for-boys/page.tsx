import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints.stylex";
import { DetailPageTitle } from "@/components/home/detail-page-title";
import AGSB from "@/logos/AGSB.webp";
import { border, color, font, space } from "@/tokens.stylex";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return (
    <>
      <DetailPageTitle
        type="education"
        title={t("schoolName")}
        role={t("course")}
        date={t("date")}
        locale={params.locale}
        logo={{ src: AGSB, alt: t("schoolName") }}
        grade={t("grade")}
      />

      <section css={styles.modulesSection}>
        <h2 css={styles.heading}>
          <span css={styles.icon}>📖</span>
          {t("modules")}
        </h2>
        <div css={styles.moduleGrid}>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>01</span>
            <span css={styles.moduleName}>{t("computing")}</span>
          </div>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>02</span>
            <span css={styles.moduleName}>{t("mathematics")}</span>
          </div>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>03</span>
            <span css={styles.moduleName}>{t("chinese")}</span>
          </div>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>04</span>
            <span css={styles.moduleName}>{t("physics")}</span>
          </div>
        </div>
      </section>
    </>
  );
}

const styles = stylex.create({
  modulesSection: {
    marginBottom: {
      default: space._8,
      [breakpoints.md]: space._10,
    },
  },
  heading: {
    color: color.textMain,
    fontSize: {
      default: font.size_4,
      [breakpoints.md]: font.size_5,
    },
    fontWeight: font.weight_7,
    margin: 0,
    marginBottom: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
    display: "flex",
    alignItems: "center",
    gap: space._3,
    paddingBottom: space._3,
    position: "relative",
    "::after": {
      content: '""',
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "120px",
      height: "3px",
      backgroundColor: color.controlActive,
    },
  },
  icon: {
    fontSize: {
      default: font.size_3,
      [breakpoints.md]: font.size_4,
    },
  },
  moduleGrid: {
    display: "grid",
    gap: {
      default: space._4,
      [breakpoints.md]: space._6,
    },
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.sm]: "repeat(2, 1fr)",
      [breakpoints.xl]: "repeat(4, 1fr)",
    },
  },
  moduleCard: {
    backgroundColor: color.backgroundRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: {
      default: color.controlTrack,
      ":hover": color.controlActive,
    },
    borderRadius: border.radius_3,
    padding: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    transform: {
      default: "translateY(0)",
      ":hover": "translateY(-2px)",
    },
    transitionProperty: "all",
    transitionDuration: "0.2s",
  },
  moduleNumber: {
    fontSize: {
      default: font.size_7,
      [breakpoints.md]: font.size_8,
    },
    fontWeight: font.weight_8,
    color: color.textMuted,
    opacity: 0.2,
    lineHeight: 1,
  },
  moduleName: {
    fontSize: {
      default: font.size_2,
      [breakpoints.md]: font.size_3,
    },
    fontWeight: font.weight_6,
    color: color.textMain,
  },
});
