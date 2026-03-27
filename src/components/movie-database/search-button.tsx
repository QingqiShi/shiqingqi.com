import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { AnchorButton } from "../shared/anchor-button";

export function SearchButton() {
  const locale = getLocale();

  return (
    <AnchorButton
      icon={<SparkleIcon weight="fill" role="presentation" />}
      href={getLocalePath("/movie-database/ai-mode", locale)}
      aria-label={t({
        en: "Search movies and TV shows with AI",
        zh: "使用 AI 搜索电影和电视剧",
      })}
      hideLabelOnMobile
    >
      {t({ en: "AI Search", zh: "AI 搜索" })}
    </AnchorButton>
  );
}
