import type { Metadata } from "next";
import { DocPage } from "#src/components/design-system/doc-page.tsx";
import { MovieDetailShowcase } from "#src/components/design-system/sections/examples/movie-detail-showcase.tsx";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/examples/movie-detail",
    description: t({
      en: "A whole movie-details screen composed entirely from the @tuja/ui design system — every surface, control, and type step is a component, primitive, or token.",
      zh: "一整个影片详情页面，完全由 @tuja/ui 设计系统组合而成——每一个表面、控件与字号阶梯都是组件、原语或令牌。",
    }),
  });
}

export default function MovieDetailExamplePage() {
  return (
    <DocPage
      path="/design-system/examples/movie-detail"
      description={t({
        en: "One screen from the movie database, rebuilt with nothing but this system. The reference pages document the parts one at a time; this is what they add up to — a real hierarchy, real state, and a composition that has to hold together at every width and in both themes.",
        zh: "影视数据库中的一个页面，完全由本系统重建。参考页面逐个说明各个部件，而这里展示它们组合起来的样子——真实的层级、真实的状态，以及一个必须在各种宽度、明暗两种主题下都站得住的组合。",
      })}
    >
      <MovieDetailShowcase />
    </DocPage>
  );
}
