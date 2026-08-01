import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { PopoverShowcase } from "#src/components/design-system/sections/components/popover-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/popover",
    title: t({ en: "Popover", zh: "浮层" }),
  });
}

export default function PopoverPage() {
  return (
    <DocPage
      title={t({ en: "Popover", zh: "浮层" })}
      description={t({
        en: "Arbitrary content hung off a trigger and placed against the window, so the side flips and the panel shifts to stay on screen — dismissed by Escape, an outside pointer, or focus leaving, and never trapping either focus or scroll.",
        zh: "挂在触发元素上的任意内容，相对窗口定位，因此会翻转方向、平移位置以始终留在屏幕内——按 Escape、在外部点击或让焦点离开即可关闭，且从不捕获焦点或锁定滚动。",
      })}
    >
      <PopoverShowcase />
    </DocPage>
  );
}
