import {
  Breadcrumb,
  type BreadcrumbLinkProps,
} from "@tuja/ui/components/breadcrumb";
import Link from "next/link";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import {
  type DesignSystemPath,
  type DesignSystemSectionId,
  getDesignSystemRouteSection,
} from "./routes.ts";

interface DocBreadcrumbProps {
  path: DesignSystemPath;
  /** The page's own name — the trailing crumb, and the `h1` right below it. */
  title: string;
}

/** The link Slot's contract: forward `className` and `style` onto the anchor. */
function RouterLink({ href, children, className, style }: BreadcrumbLinkProps) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

/**
 * Where a design-system page sits: the overview, the section it belongs to,
 * then the page itself. The section crumb carries no `href` — the sections are
 * headings in the nav rail and the overview grid, not pages of their own.
 */
export function DocBreadcrumb({ path, title }: DocBreadcrumbProps) {
  // Total over the sections so a new one fails to compile rather than losing
  // its crumb. `overview` is the root crumb already, so it adds nothing.
  const sectionLabels: Record<DesignSystemSectionId, string | null> = {
    overview: null,
    foundations: t({ en: "Foundations", zh: "基础" }),
    components: t({ en: "Components", zh: "组件" }),
    composition: t({ en: "Composition", zh: "组合" }),
  };
  const section = sectionLabels[getDesignSystemRouteSection(path)];

  return (
    <Breadcrumb
      label={t({ en: "Breadcrumb", zh: "面包屑导航" })}
      linkComponent={RouterLink}
      items={[
        {
          label: t({ en: "Design system", zh: "设计系统" }),
          href: getLocalePath("/design-system", getLocale()),
        },
        ...(section === null ? [] : [{ label: section }]),
        { label: title },
      ]}
    />
  );
}
