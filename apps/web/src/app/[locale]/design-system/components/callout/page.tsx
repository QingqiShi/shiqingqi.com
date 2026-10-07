import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { CalloutShowcase } from "#src/design-system/sections/components/callout-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/callout",
    description: t({
      en: "An inline message box with six Intents, a built-in icon, an optional title, and a dismiss affordance — the tinted surface, border, and icon carry the Intent, never a leading accent bar.",
      zh: "行内消息框，提供六种意图色、内置图标、可选标题与关闭控件——由着色背景、边框与图标传达意图色，绝不使用前缘装饰条。",
    }),
  });
}

export default function CalloutPage() {
  return (
    <DocPage path="/design-system/components/callout">
      <CalloutShowcase />
    </DocPage>
  );
}
