import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { CalloutShowcase } from "#src/components/design-system/sections/components/callout-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
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
    <DocPage
      path="/design-system/components/callout"
      description={t({
        en: "An inline message or alert box. A token-themed subtle background, matching border, and tinted icon carry the Intent, and the box itself is the live region so its text is announced. Add a title for a heading, override or drop the icon, and pair onDismiss with a label for a close button.",
        zh: "行内消息或提醒框。令牌主题化的浅色背景、匹配的边框与着色图标共同传达意图色，框体本身即为 live region，会播报其文本。可添加标题、覆盖或移除图标，并将 onDismiss 与 label 搭配以提供关闭按钮。",
      })}
    >
      <CalloutShowcase />
    </DocPage>
  );
}
