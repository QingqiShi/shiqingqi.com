import { BackButton } from "@/components/shared/back-button";
import { FixedContainerContent } from "@/components/shared/fixed-container-content";
import { LocaleSelector } from "@/components/shared/locale-selector";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";

interface HeaderProps {
  locale: SupportedLocale;
}

export function Header({ locale }: HeaderProps) {
  const { t } = getTranslations(translations, locale);

  return (
    <header className="fixed top-[env(safe-area-inset-top)] right-0 left-0 h-20 z-header pointer-events-none pr-[var(--removed-body-scroll-bar-size,0px)]">
      <nav
        className={cn(
          "max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)]",
          "my-0 mx-auto py-0 h-full",
          "flex justify-between items-center",
          "pointer-events-none",
          "pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]",
        )}
      >
        <FixedContainerContent className="pointer-events-auto flex items-center gap-2">
          <BackButton locale={locale} label={t("backLabel")} />
        </FixedContainerContent>
        <div className="pointer-events-auto flex items-center gap-2">
          <FixedContainerContent>
            <ThemeSwitch
              labels={[
                t("switchToLight"),
                t("switchToDark"),
                t("switchToSystem"),
              ]}
            />
          </FixedContainerContent>
          <LocaleSelector
            label={t("localeSelectorLabel")}
            ariaLabel={t("localeSelectorAriaLabel")}
            locale={locale}
          />
        </div>
      </nav>
    </header>
  );
}
