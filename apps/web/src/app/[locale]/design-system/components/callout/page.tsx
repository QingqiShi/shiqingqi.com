import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { CalloutShowcase } from "#src/components/design-system/sections/components/callout-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/callout",
    title: t({ en: "Callout", zh: "提示框" }),
    description: t({
      en: "An inline message box with six semantic variants, a built-in glyph, an optional title, and a dismiss affordance — the tinted surface, border, and icon carry the tone, never a leading accent bar.",
      zh: "行内消息框，提供六种语义变体、内置字形、可选标题与关闭控件——由色调背景、边框与图标传达语义，绝不使用前缘装饰条。",
    }),
  });
}

export default function CalloutPage() {
  return (
    <DocPage
      title={t({ en: "Callout", zh: "提示框" })}
      description={t({
        en: "An inline message or alert box. A token-themed subtle background, matching border, and tinted glyph carry the variant's meaning, and the box itself is the live region so its text is announced. Add a title for a heading, override or drop the glyph, and pair onDismiss with a label for a close button.",
        zh: "行内消息或提醒框。语义化的浅色背景、匹配的边框与着色字形共同传达变体含义，框体本身即为 live region，会播报其文本。可添加标题、覆盖或移除字形，并将 onDismiss 与 label 搭配以提供关闭按钮。",
      })}
    >
      <CalloutShowcase />
    </DocPage>
  );
}
