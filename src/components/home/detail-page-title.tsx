import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "../../app/[locale]/(home)/(details)/translations.json";

interface PageTitleProps {
  type: "experience" | "education";
  title: string;
  role: string;
  date: string;
  locale: SupportedLocale;
}

export function DetailPageTitle({
  date,
  locale,
  role,
  title,
  type,
}: PageTitleProps) {
  const { t } = getTranslations(translations, locale);

  return (
    <header className="flex flex-col gap-1 pb-8">
      <h2 className="text-base font-bold text-gray-11 dark:text-grayDark-11 m-0">
        {t(type)} - {title}
      </h2>
      <h1 className="text-4xl m-0">{role}</h1>
      <time className="block text-base text-gray-11 dark:text-grayDark-11">
        {date}
      </time>
    </header>
  );
}
