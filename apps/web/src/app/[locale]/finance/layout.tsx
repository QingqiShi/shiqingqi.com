import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { financeWebAppMetadata } from "#src/finance/pwa/finance-web-app-metadata.ts";

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
