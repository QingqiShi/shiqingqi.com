import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SwitchShowcase } from "#src/components/design-system/sections/components/switch-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/switch",
    title: t({ en: "Switch", zh: "开关" }),
  });
}

export default function SwitchPage() {
  return (
    <DocPage
      title={t({ en: "Switch", zh: "开关" })}
      description={t({
        en: "A draggable, three-state toggle. Click, drag the thumb, or use the keyboard — on, off, and an indeterminate middle state, controlled or uncontrolled.",
        zh: "可拖动的三态开关。支持点击、拖动滑块或键盘操作——开启、关闭以及居中的未定状态，可受控或非受控使用。",
      })}
    >
      <SwitchShowcase />
    </DocPage>
  );
}
