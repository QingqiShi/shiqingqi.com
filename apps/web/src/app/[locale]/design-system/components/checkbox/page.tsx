import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { CheckboxShowcase } from "#src/components/design-system/sections/components/checkbox-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/checkbox",
    title: t({ en: "Checkbox", zh: "复选框" }),
    description: t({
      en: "A labelled checkbox built on a native input, with a tri-state indeterminate dash, description, and inline error.",
      zh: "基于原生 input 的带标签复选框，支持三态的中间横线状态、说明文字与内联错误提示。",
    }),
  });
}

export default function CheckboxPage() {
  return (
    <DocPage
      title={t({ en: "Checkbox", zh: "复选框" })}
      description={t({
        en: "A labelled checkbox built on a native input, so keyboard activation, focus, and label association come for free. Supports a tri-state indeterminate dash for select-all groups, a description, and an inline error message.",
        zh: "基于原生 input 的带标签复选框，键盘操作、聚焦与标签关联皆开箱即用。支持用于全选分组的三态中间横线状态、说明文字与内联错误提示。",
      })}
    >
      <CheckboxShowcase />
    </DocPage>
  );
}
