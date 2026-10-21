import type { Metadata } from "next";
import { financeWebAppMetadata } from "#src/finance/pwa/finance-web-app-metadata.ts";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const locale = validateLocale(params.locale);
  return {
    title: {
      default: t({ en: "Finance | Qingqi Shi", zh: "家庭账本 | 石清琪" }),
      template: t({
        en: "%s | Finance | Qingqi Shi",
        zh: "%s | 家庭账本 | 石清琪",
      }),
    },
    robots: { index: false, follow: false },
    ...financeWebAppMetadata(locale),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
