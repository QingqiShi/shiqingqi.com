import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { SpinnerShowcase } from "#src/components/design-system/sections/components/spinner-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../route-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/spinner",
    title: t({ en: "Spinner", zh: "加载指示器" }),
    description: t({
      en: "An indeterminate loading indicator in three rem-scaled sizes and two tones. It requires either a label or aria-hidden, and swaps its rotation for a gentle opacity pulse under reduced-motion.",
      zh: "不确定型加载指示器，提供三种按 rem 缩放的尺寸与两种色调。它要求提供 label 或 aria-hidden，并在减弱动态时以柔和的透明度脉动取代旋转。",
    }),
  });
}

export default function SpinnerPage() {
  return (
    <DocPage
      title={t({ en: "Spinner", zh: "加载指示器" })}
      description={t({
        en: "An indeterminate loading indicator — a gapped ring that spins smoothly. Sizes map to rem so it scales with the user's font size; tone inherits the surrounding text colour or pins the accent. It needs an accessible name via label, unless it sits inside an already-labelled busy region, where it should be aria-hidden.",
        zh: "不确定型加载指示器——平滑旋转的缺口圆环。尺寸以 rem 表示，随用户字号缩放；色调可继承周围文本颜色或固定强调色。它需要通过 label 提供无障碍名称，除非位于已带标签的繁忙区域内，此时应设为 aria-hidden。",
      })}
    >
      <SpinnerShowcase />
    </DocPage>
  );
}
