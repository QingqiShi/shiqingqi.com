import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { TextFieldShowcase } from "#src/components/design-system/sections/components/text-field-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/text-field",
    title: t({ en: "Text field", zh: "文本输入框" }),
    description: t({
      en: "A single-line text input with a built-in label, optional helper text, adornment slots, and an accessible error state.",
      zh: "单行文本输入框，内置标签、可选的说明文字、装饰图标槽位，以及无障碍的错误状态。",
    }),
  });
}

export default function TextFieldPage() {
  return (
    <DocPage
      title={t({ en: "Text field", zh: "文本输入框" })}
      description={t({
        en: "A single-line text input with a built-in label, optional helper text, and an accessible error state. Three sizes, leading and trailing adornment slots, and full native input props — server-renderable out of the box.",
        zh: "单行文本输入框，内置标签、可选的说明文字与无障碍的错误状态。提供三种尺寸、前置与后置装饰槽位，以及完整的原生 input 属性——开箱即可在服务端渲染。",
      })}
    >
      <TextFieldShowcase />
    </DocPage>
  );
}
