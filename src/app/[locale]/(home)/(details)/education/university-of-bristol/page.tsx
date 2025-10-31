import * as stylex from "@stylexjs/stylex";
import Image from "next/image";
import { breakpoints } from "@/breakpoints.stylex";
import { DetailPageTitle } from "@/components/home/detail-page-title";
import { Anchor } from "@/components/shared/anchor";
import BristolLogo from "@/logos/bristol-logo";
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
        logo={<BristolLogo title={t("schoolName")} />}
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
            <span css={styles.moduleName}>{t("webDevelopment")}</span>
          </div>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>02</span>
            <span css={styles.moduleName}>{t("graphics")}</span>
          </div>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>03</span>
            <span css={styles.moduleName}>{t("animation")}</span>
          </div>
          <div css={styles.moduleCard}>
            <span css={styles.moduleNumber}>04</span>
            <span css={styles.moduleName}>{t("robotics")}</span>
          </div>
        </div>
      </section>

      <section css={styles.projectsSection}>
        <h2 css={styles.projectsHeading}>
          <span css={styles.icon}>🚀</span>
          {t("exampleProjects")}
        </h2>
        <div css={styles.projectsList}>
          <article css={styles.projectCard}>
            <div css={styles.projectImageWrapper}>
              <Image
                src="/projects/bristol/game-of-life.jpg"
                alt={t("gameOfLifeTitle")}
                width={600}
                height={400}
                css={styles.projectImage}
              />
            </div>
            <div css={styles.projectContent}>
              <span css={styles.projectNumber}>01</span>
              <h3 css={styles.projectTitle}>{t("gameOfLifeTitle")}</h3>
              <p css={styles.projectDescription}>
                {t("gameOfLifeDescription")}
              </p>
              <Anchor
                href="https://github.com/QingqiShi/Game-of-Life-Website"
                target="_blank"
                css={styles.projectLink}
              >
                {t("viewProject")} →
              </Anchor>
            </div>
          </article>

          <article css={styles.projectCard}>
            <div css={styles.projectImageWrapper}>
              <Image
                src="/projects/bristol/ray-tracer.jpg"
                alt={t("rayTracerTitle")}
                width={600}
                height={400}
                css={styles.projectImage}
              />
            </div>
            <div css={styles.projectContent}>
              <span css={styles.projectNumber}>02</span>
              <h3 css={styles.projectTitle}>{t("rayTracerTitle")}</h3>
              <p css={styles.projectDescription}>{t("rayTracerDescription")}</p>
              <Anchor
                href="https://github.com/QingqiShi/Ray-Tracer"
                target="_blank"
                css={styles.projectLink}
              >
                {t("viewProject")} →
              </Anchor>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

const styles = stylex.create({
  modulesSection: {
    marginBottom: {
      default: space._10,
      [breakpoints.md]: space._12,
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
      default: space._4,
      [breakpoints.md]: space._5,
    },
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    transform: {
      default: "translateY(0)",
      ":hover": "translateY(-2px)",
    },
    transitionProperty: "all",
    transitionDuration: "0.2s",
  },
  moduleNumber: {
    fontSize: {
      default: font.size_6,
      [breakpoints.md]: font.size_7,
    },
    fontWeight: font.weight_7,
    color: color.textMuted,
    opacity: 0.08,
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
  projectsSection: {
    marginBottom: space._8,
    paddingTop: {
      default: space._8,
      [breakpoints.md]: space._10,
    },
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
  },
  projectsHeading: {
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
  projectsList: {
    display: "flex",
    flexDirection: "column",
    gap: {
      default: space._8,
      [breakpoints.md]: space._10,
    },
  },
  projectCard: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, 1fr)",
    },
    gap: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
    alignItems: "start",
  },
  projectImageWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: "3 / 2",
    overflow: "hidden",
    borderRadius: border.radius_3,
  },
  projectImage: {
    objectFit: "cover",
    width: "100%",
    height: "100%",
    filter: "saturate(0.85) contrast(1.1) brightness(0.95)",
  },
  projectContent: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    padding: {
      default: space._4,
      [breakpoints.md]: 0,
    },
  },
  projectNumber: {
    fontSize: {
      default: font.size_6,
      [breakpoints.md]: font.size_7,
    },
    fontWeight: font.weight_7,
    color: color.textMuted,
    opacity: 0.08,
    lineHeight: 1,
  },
  projectTitle: {
    fontSize: {
      default: font.size_4,
      [breakpoints.md]: font.size_5,
    },
    fontWeight: font.weight_7,
    color: color.textMain,
    margin: 0,
    marginTop: `-${space._6}`,
  },
  projectDescription: {
    fontSize: font.size_1,
    lineHeight: font.lineHeight_5,
    fontWeight: font.weight_4,
    color: color.textMuted,
    margin: 0,
  },
  projectLink: {
    fontSize: font.size_0,
    fontWeight: font.weight_7,
    letterSpacing: "0.05em",
    marginTop: space._2,
    paddingBlock: space._2,
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
    textDecorationThickness: "2px",
    textUnderlineOffset: "4px",
    transitionProperty: "text-decoration",
    transitionDuration: "0.2s",
  },
});
