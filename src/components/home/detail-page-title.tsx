import * as stylex from "@stylexjs/stylex";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { Suspense, ViewTransition } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { Skeleton } from "@/components/shared/skeleton";
import { ratio, color, font, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "../../app/[locale]/(home)/(details)/translations.json";

interface PageTitleProps {
  type: "experience" | "education";
  title: string;
  role: string;
  date: string;
  locale: SupportedLocale;
  logo?: React.ReactNode | { src: StaticImageData; alt: string };
  grade?: string;
}

export function DetailPageTitle({
  date,
  locale,
  logo,
  role,
  title,
  type,
  grade,
}: PageTitleProps) {
  const { t } = getTranslations(translations, locale);

  return (
    <header css={styles.container}>
      <div css={styles.topRow}>
        {logo && (
          <div css={styles.logo}>
            {typeof logo === "object" && logo && "src" in logo ? (
              <Image
                src={logo.src}
                alt={logo.alt}
                title={logo.alt}
                css={styles.img}
              />
            ) : (
              <Suspense fallback={<Skeleton fill />}>{logo}</Suspense>
            )}
          </div>
        )}
        <div css={styles.titleGroup}>
          <p css={styles.type}>{t(type).toUpperCase()}</p>
          <h2 css={styles.subtitle}>
            <ViewTransition name={`${title.replaceAll(" ", "-")}-name`}>
              <span>{title}</span>
            </ViewTransition>
          </h2>
        </div>
      </div>

      <h1 css={styles.title}>{role}</h1>

      <div css={styles.metaRow}>
        <ViewTransition name={`${title.replaceAll(" ", "-")}-date`}>
          <time css={styles.date}>
            <span css={styles.icon}>📅</span> {date}
          </time>
        </ViewTransition>
        {grade && (
          <>
            <span css={styles.separator}>•</span>
            <p css={styles.grade}>
              <span css={styles.icon}>🎓</span> {grade}
            </p>
          </>
        )}
      </div>
    </header>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
    paddingBottom: {
      default: space._6,
      [breakpoints.md]: space._8,
    },
  },
  topRow: {
    display: "flex",
    flexDirection: "row",
    gap: {
      default: space._4,
      [breakpoints.md]: space._6,
    },
    alignItems: "flex-start",
  },
  logo: {
    alignItems: "center",
    aspectRatio: ratio.square,
    display: "flex",
    justifyContent: "flex-start",
    flexShrink: 0,
    width: {
      default: "60px",
      [breakpoints.md]: "80px",
      [breakpoints.lg]: "100px",
    },
  },
  img: {
    height: "100%",
    maxWidth: "100%",
    objectFit: "contain",
  },
  titleGroup: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    flex: "1",
  },
  type: {
    fontSize: font.size_00,
    fontWeight: font.weight_6,
    color: color.textMuted,
    letterSpacing: "0.1em",
    margin: 0,
  },
  subtitle: {
    fontSize: {
      default: font.size_1,
      [breakpoints.md]: font.size_2,
    },
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
  },
  title: {
    fontSize: {
      default: font.size_3,
      [breakpoints.md]: font.size_4,
      [breakpoints.lg]: font.size_5,
    },
    lineHeight: font.lineHeight_1,
    margin: 0,
  },
  metaRow: {
    display: "flex",
    flexDirection: "row",
    gap: space._3,
    alignItems: "center",
  },
  date: {
    display: "block",
    fontSize: {
      default: font.size_0,
      [breakpoints.md]: font.size_1,
    },
    color: color.textMuted,
  },
  separator: {
    color: color.textMuted,
    fontSize: font.size_1,
  },
  grade: {
    fontSize: {
      default: font.size_0,
      [breakpoints.md]: font.size_1,
    },
    color: color.textMuted,
    margin: 0,
  },
  icon: {
    marginRight: space._2,
  },
});
