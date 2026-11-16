import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";

/**
 * The last destination of each pattern. It is not part of the pattern: it
 * leads out of the app frame, back to the Patterns page.
 */
export function usePatternsExitItem() {
  const locale = useLocale();
  return {
    href: getLocalePath("/design-system/patterns", locale),
    label: t({ en: "Docs", zh: "文档" }),
    icon: ArrowUUpLeftIcon,
  };
}
