import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { SheetShowcase } from "#src/design-system/sections/components/sheet-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/sheet",
    description: t({
      en: "A modal card over the dimmed page. Below md it floats at the bottom of the screen, fits its content, and closes on a drag down; from md up it sits in the centre.",
      zh: "压暗页面之上的模态卡片。在 md 以下它浮在屏幕底部，高度随内容而定，向下拖动即可关闭；从 md 起居中显示。",
    }),
  });
}

export default function SheetPage() {
  return (
    <DocPage path="/design-system/components/sheet">
      <SheetShowcase />
    </DocPage>
  );
}
