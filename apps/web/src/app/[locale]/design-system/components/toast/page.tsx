import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { ToastShowcase } from "#src/design-system/sections/components/toast-showcase.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/toast",
    description: t({
      en: "A short message on a capsule of Glass about what an action did, with an optional Undo and a close button. One shows at a time at the bottom of the screen, springs up as it arrives, and a Ring light runs once round its edge.",
      zh: "玻璃胶囊上的一条短消息，告知某个操作的结果，可附带撤销与关闭按钮。屏幕底部一次只显示一条，出现时弹起，环形光沿边缘跑一圈。",
    }),
  });
}

export default function ToastPage() {
  return (
    <DocPage path="/design-system/components/toast">
      <ToastShowcase />
    </DocPage>
  );
}
