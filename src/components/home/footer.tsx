import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { Anchor } from "../shared/anchor";
import translations from "./translations.json";

interface FooterProps {
  locale: SupportedLocale;
}

export function Footer({ locale }: FooterProps) {
  const { t } = getTranslations(translations, locale);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="flex flex-wrap justify-between items-center pb-8 mt-[40px] sm:mt-[64px]">
      <div
        className={cn(
          "flex flex-col",
          "items-center md:items-start md:items-center",
          "mb-7 md:mb-0",
          "w-full md:w-1/2",
        )}
      >
        <Anchor
          href="https://github.com/QingqiShi"
          target="_blank"
          rel="nofollow me noopener noreferrer"
          className="block text-base [&:not(:last-of-type)]:mb-0 py-1 md:py-0"
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
          className="block text-base [&:not(:last-of-type)]:mb-0 py-1 md:py-0"
        >
          LinkedIn
        </Anchor>
      </div>
      <div
        className={cn(
          "w-full md:w-1/2",
          "text-center md:text-right md:items-center md:justify-end",
        )}
      >
        <small>
          <span className="block font-extrabold text-2xl">{t("name")}</span>
          <span className="block font-extrabold text-xl">© {currentYear}</span>
        </small>
      </div>
    </footer>
  );
}
