import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { BordersShowcase } from "#src/components/design-system/sections/tokens/borders-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/borders",
    description: t({
      en: "Five border thicknesses and a corner-radius scale, each drawn at true size — fixed radii as squircles, the full pill with circular caps — with guidance on which radius fits inputs, cards, and pills.",
      zh: "五种描边粗细与一套圆角阶梯，皆按真实尺寸呈现——固定圆角为超椭圆角，完整胶囊形保留圆弧端帽——并附上输入框、卡片与胶囊形分别适用哪种圆角的指引。",
    }),
  });
}

export default function BordersPage() {
  return (
    <DocPage
      path="/design-system/foundations/borders"
      description={t({
        en: "The edges of the system: rule thicknesses for surfaces and dividers, and a corner-radius scale, its fixed steps rendered as squircles, that reads as a hierarchy — tight on controls, softer on the surfaces that hold them, full pill for chips and avatars.",
        zh: "系统的边缘：用于表面与分隔的线宽，以及一套固定阶梯以超椭圆角呈现、本身即为层级的圆角阶梯——控件上更紧、承载它们的表面上更柔和、标签与头像用完整胶囊形。",
      })}
    >
      <BordersShowcase />
    </DocPage>
  );
}
