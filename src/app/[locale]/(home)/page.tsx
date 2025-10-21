import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { BackgroundLines } from "@/components/home/background-lines";
import { EducationCard } from "@/components/home/education-card";
import { ExperienceCard } from "@/components/home/experience-card";
import { ProjectCard } from "@/components/home/project-card";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import AGSB from "@/logos/AGSB.webp";
import BristolLogo from "@/logos/bristol-logo";
import CitadelLogo from "@/logos/citadel-logo";
import NottinghamLogo from "@/logos/nottingham-logo";
import SpotifyLogo from "@/logos/spotify-logo";
import WtcLogo from "@/logos/wtc-logo";
import type { PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { getLocalePath } from "@/utils/pathname";
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
      <section className="pb-7 sm:pb-9">
        <h1 className="m-0 mb-3 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold">
          {t("headline_1")}
          <br />
          {t("headline_2")}
        </h1>
        <p className="m-0">{t("brief", { parse: true })}</p>
      </section>

      <section>
        <h2 className="mt-7 mb-3 text-3xl font-bold">{t("projectSection")}</h2>
        <div className="flex flex-wrap">
          <ProjectCard
            icon={<FilmSlateIcon size={64} weight="fill" />}
            href={getLocalePath("/movie-database", locale)}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 [--svg-fill:var(--color-brand-tmdb)]"
            name={t("movieDatabase")}
            description={t("movieDatabaseDescription")}
            scroll
          />
        </div>
      </section>

      <section>
        <h2 className="mt-7 mb-3 text-3xl font-bold">
          {t("experiencesSection")}
        </h2>
        <div className="flex flex-wrap">
          <ExperienceCard
            logo={<CitadelLogo />}
            dates={t("citadelDate")}
            href={getLocalePath("/experiences/citadel", locale)}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
            aria-label={t("citadelLabel")}
            scroll
          />
          <ExperienceCard
            logo={<SpotifyLogo />}
            dates={t("spotifyDate")}
            href={getLocalePath("/experiences/spotify", locale)}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
            aria-label={t("spotifyLabel")}
          />
          <ExperienceCard
            logo={<WtcLogo />}
            dates={t("wtcDate")}
            href={getLocalePath(
              "/experiences/wunderman-thompson-commerce",
              locale,
            )}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
            aria-label={t("wtcLabel")}
          />
        </div>
      </section>
      <section>
        <h2 className="mt-7 mb-3 text-3xl font-bold">
          {t("educationSection")}
        </h2>
        <div className="flex flex-wrap">
          <EducationCard
            logo={<BristolLogo title={t("uob")} />}
            name={t("uob")}
            dates={t("uobDate")}
            href={getLocalePath("/education/university-of-bristol", locale)}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
          />
          <EducationCard
            logo={<NottinghamLogo title={t("uon")} />}
            name={t("uon")}
            dates={t("uonDate")}
            href={getLocalePath("/education/university-of-nottingham", locale)}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
          />
          <EducationCard
            logo={{ src: AGSB, alt: t("agsb") }}
            name={t("agsb")}
            dates={t("agsbDate")}
            href={getLocalePath(
              "/education/altrincham-grammar-school-for-boys",
              locale,
            )}
            className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
          />
        </div>
      </section>
    </TranslationProvider>
  );
}
