import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SelectShowcase } from "#src/components/design-system/sections/components/select-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/select",
    title: t({ en: "Select", zh: "下拉选择" }),
    description: t({
      en: "A labelled wrapper around a native select with a themed chevron, config-layer options, a placeholder, and an error state.",
      zh: "对原生 select 的带标签封装，配有主题化下拉箭头、配置式选项、占位提示与错误状态。",
    }),
  });
}

export default function SelectPage() {
  return (
    <DocPage
      title={t({ en: "Select", zh: "下拉选择" })}
      description={t({
        en: "A labelled wrapper around a native select, chosen for its built-in keyboard handling and platform picker. Feed choices through the options prop or drop down to option children for groups, with a themed chevron, placeholder, and error state.",
        zh: "对原生 select 的带标签封装，因其内置键盘处理与平台原生选择器而采用。可通过 options 属性提供选项，或使用 option 子元素进行分组，并配有主题化下拉箭头、占位提示与错误状态。",
      })}
    >
      <SelectShowcase />
    </DocPage>
  );
}
