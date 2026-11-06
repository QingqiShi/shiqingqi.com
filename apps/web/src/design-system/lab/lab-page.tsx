import "server-only";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { PageProps as LocalePageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { designSystemMetadata } from "#src/app/[locale]/design-system/design-system-metadata.ts";
import { DocArticle } from "#src/design-system/doc-article.tsx";
import type { DesignSystemLabPath } from "#src/design-system/routes/types.ts";

/**
 * Next writes `LayoutProps` and `PageProps` from the files under `app/`, and
 * each one accepts only a route that has that file. Thus this type fails to
 * compile when a route sets `lab: true` but has no `layout.tsx` or no
 * `lab/page.tsx`.
 */
export type LabRouteFiles = [
  LayoutProps<`/[locale]${DesignSystemLabPath}`>,
  PageProps<`/[locale]${DesignSystemLabPath}/lab`>,
];

interface LabArticleProps {
  path: DesignSystemLabPath;
  /** The opening paragraph of the documentation view. */
  description: ReactNode;
  children: ReactNode;
}

/**
 * The article of a route with a Lab, for the route's `layout.tsx`. The header
 * then stays mounted while the view switches, and the switch's indicator
 * slides between the two views. `DocPage` leaves the article out on such a
 * route.
 */
export function LabArticle({ path, description, children }: LabArticleProps) {
  return (
    <DocArticle path={path} description={description}>
      {children}
    </DocArticle>
  );
}

/** `"/design-system/components/segmented-control"` → `"SegmentedControl"`. */
function componentName(path: DesignSystemLabPath): string {
  return (path.split("/").at(-1) ?? "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * The metadata of a route's Lab view. Its title is the component's name as
 * code writes it, then the word "Lab", in both locales: "Button 实验室".
 */
export async function labMetadata(
  props: LocalePageProps,
  path: DesignSystemLabPath,
): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path,
    view: "lab",
    title: `${componentName(path)} ${t({ en: "Lab", zh: "实验室" })}`,
  });
}

interface LabPageProps {
  /** The Lab itself, from `defineLab`: a client island, because the Canvas is operable. */
  lab: ComponentType;
}

/**
 * The Lab view: the Canvas, a step below the header the route's `layout.tsx`
 * renders. It takes the Shell's content width rather than the reading column,
 * because the Lab has nothing to read — the title stands over the Canvas and
 * the view switch over the controls. The description stays on the
 * documentation view.
 */
export function LabPage({ lab: Lab }: LabPageProps) {
  return (
    <div css={styles.page}>
      <Lab />
    </div>
  );
}

const styles = stylex.create({
  page: {
    marginBlockStart: rhythm.item,
  },
});
