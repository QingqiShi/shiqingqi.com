import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SelectShowcase } from "#src/design-system/sections/components/select-showcase.tsx";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/select",
    description: t({
      en: "A labelled wrapper around a native select with a themed chevron, config-layer options, a placeholder, and an error state.",
      zh: "对原生 select 的带标签封装，配有主题化下拉箭头、配置式选项、占位提示与错误状态。",
    }),
  });
}

export default function SelectPage() {
  return (
    <DocPage
      path="/design-system/components/select"
      description={t({
        en: "A labelled wrapper around a native select, chosen for its built-in keyboard handling and platform picker. Feed choices through the options prop or drop down to option children for groups, with a themed chevron, placeholder, and error state.",
        zh: "对原生select的带标签封装，因其内置键盘处理与平台原生选择器而采用。可通过options属性提供选项，或使用option子元素进行分组，并配有主题化下拉箭头、占位提示与错误状态。",
      })}
    >
      <SelectShowcase />
    </DocPage>
  );
}
