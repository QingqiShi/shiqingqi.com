import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { AvatarShowcase } from "#src/components/design-system/sections/components/avatar-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/components/avatar",
  });
}

export default function AvatarPage() {
  return (
    <DocPage
      path="/design-system/components/avatar"
      description={t({
        en: "A circular medallion standing for one person: their portrait when there is one, a monogram derived from their name when there isn't, and an optional corner badge for what they're doing.",
        zh: "代表某个人的圆形徽章：有头像时显示头像，没有时显示由姓名推导出的字母缩写，并可用角标表示其状态。",
      })}
    >
      <AvatarShowcase />
    </DocPage>
  );
}
