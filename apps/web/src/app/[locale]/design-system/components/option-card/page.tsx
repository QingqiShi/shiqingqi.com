import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { OptionCardShowcase } from "#src/components/design-system/sections/components/option-card-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/option-card",
  });
}

export default function OptionCardPage() {
  return (
    <DocPage
      path="/design-system/components/option-card"
      description={t({
        en: "The card-sized answer to a question: an icon, a label, a description, and a selection mark on one tappable surface — a radiogroup when only one answer is right, independent checkboxes when several are.",
        zh: "以卡片作答的选择控件：图标、标签、说明与选中标记同处一个可点击的表面——只有一个答案时是单选组，可以多选时则是各自独立的复选框。",
      })}
    >
      <OptionCardShowcase />
    </DocPage>
  );
}
