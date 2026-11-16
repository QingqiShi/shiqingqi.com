import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import type { Metadata } from "next";
import { PreferencesSettings } from "#src/settings/preferences-settings.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Settings", zh: "设置" }) };
}

export default function Page() {
  return (
    <NavigationStack
      label={t({ en: "Settings", zh: "设置" })}
      css={pageColumn.settings}
    >
      <PreferencesSettings />
    </NavigationStack>
  );
}
