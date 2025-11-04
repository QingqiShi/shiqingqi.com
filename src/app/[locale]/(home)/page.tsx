import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { BackgroundLines } from "#src/components/home/background-lines.tsx";
import { EducationCard } from "#src/components/home/education-card.tsx";
import { ExperienceCard } from "#src/components/home/experience-card.tsx";
import { ProjectCard } from "#src/components/home/project-card.tsx";
import cardTranslations from "#src/components/shared/card.translations.json";
import { TranslationProvider } from "#src/components/shared/translation-provider.tsx";
import AGSB from "#src/logos/AGSB.webp";
import BristolLogo from "#src/logos/bristol-logo.tsx";
import CitadelLogo from "#src/logos/citadel-logo.tsx";
import NottinghamLogo from "#src/logos/nottingham-logo.tsx";
import SpotifyLogo from "#src/logos/spotify-logo.tsx";
import { svgTokens } from "#src/logos/svg.stylex.ts";
import WtcLogo from "#src/logos/wtc-logo.tsx";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import translations from "./translations.json";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default async function Home(props: PageProps) {
  const { locale } = await props.params;
  const { t } = getTranslations(translations, locale);
  return (
    <TranslationProvider
      locale={locale}
      translations={{ card: cardTranslations }}
    >
      <BackgroundLines />
      <section css={styles.headlineContainer}>
        <h1 css={styles.headline}>
          {t("headline_1")}
          <br />
          {t("headline_2")}
        </h1>
        <p css={styles.brief}>{t("brief", { parse: true })}</p>
      </section>

      <section>
        <h2 css={styles.sectionTitle}>{t("projectSection")}</h2>
        <div css={styles.cardList}>
          <ProjectCard
            icon={<FilmSlateIcon size={64} weight="fill" />}
            href={getLocalePath("/movie-database", locale)}
            css={[styles.card, styles.movieDatabase]}
            name={t("movieDatabase")}
            description={t("movieDatabaseDescription")}
            scroll
          />
          <ProjectCard
            icon={<PackageIcon size={64} weight="fill" />}
            href={getLocalePath("/component-library", locale)}
            css={[styles.card, styles.componentLibrary]}
            name={t("componentLibrary")}
            description={t("componentLibraryDescription")}
            scroll
          />
        </div>
      </section>

      <section>
        <h2 css={styles.sectionTitle}>{t("experiencesSection")}</h2>
        <div css={styles.cardList}>
          <ExperienceCard
            logo={<CitadelLogo />}
            dates={t("citadelDate")}
            href={getLocalePath("/experiences/citadel", locale)}
            css={styles.card}
            aria-label={t("citadelLabel")}
            scroll
          />
          <ExperienceCard
            logo={<SpotifyLogo />}
            dates={t("spotifyDate")}
            href={getLocalePath("/experiences/spotify", locale)}
            css={styles.card}
            aria-label={t("spotifyLabel")}
          />
          <ExperienceCard
            logo={<WtcLogo />}
            dates={t("wtcDate")}
            href={getLocalePath(
              "/experiences/wunderman-thompson-commerce",
              locale,
            )}
            css={styles.card}
            aria-label={t("wtcLabel")}
          />
        </div>
      </section>
      <section>
        <h2 css={styles.sectionTitle}>{t("educationSection")}</h2>
        <div css={styles.cardList}>
          <EducationCard
            logo={<BristolLogo title={t("uob")} />}
            name={t("uob")}
            dates={t("uobDate")}
            href={getLocalePath("/education/university-of-bristol", locale)}
            css={styles.card}
          />
          <EducationCard
            logo={<NottinghamLogo title={t("uon")} />}
            name={t("uon")}
            dates={t("uonDate")}
            href={getLocalePath("/education/university-of-nottingham", locale)}
            css={styles.card}
          />
          <EducationCard
            logo={{ src: AGSB, alt: t("agsb") }}
            name={t("agsb")}
            dates={t("agsbDate")}
            href={getLocalePath(
              "/education/altrincham-grammar-school-for-boys",
              locale,
            )}
            css={styles.card}
          />
        </div>
      </section>
    </TranslationProvider>
  );
}

const styles = stylex.create({
  headlineContainer: {
    padding: {
      default: `0 0 ${space._7}`,
      [breakpoints.sm]: `0 0 ${space._9}`,
    },
  },
  headline: {
    margin: `0 0 ${space._3} 0`,
    fontSize: {
      default: font.size_5,
      [breakpoints.sm]: font.size_6,
      [breakpoints.md]: font.size_7,
      [breakpoints.lg]: font.size_8,
    },
    fontWeight: font.weight_8,
  },
  brief: {
    margin: 0,
  },
  sectionTitle: {
    marginTop: space._7,
    marginBottom: space._3,
    fontSize: font.size_3,
    fontWeight: font.weight_7,
  },
  cardList: {
    display: "flex",
    flexWrap: "wrap",
  },
  card: {
    width: {
      default: "100%",
      [breakpoints.sm]: "50%",
      [breakpoints.md]: "33.3%",
      [breakpoints.lg]: "25%",
    },
  },
  movieDatabase: {
    [svgTokens.fill]: color.brandTmdb,
  },
  componentLibrary: {
    [svgTokens.fill]: color.controlActive,
  },
});
