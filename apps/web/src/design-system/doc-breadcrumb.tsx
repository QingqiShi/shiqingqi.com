import {
  Breadcrumb,
  type BreadcrumbLinkProps,
} from "@tuja/ui/components/breadcrumb";
import Link from "next/link";
import { getDesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import { getDesignSystemRouteSection } from "#src/design-system/routes/get-design-system-route-section.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";

interface DocBreadcrumbProps {
  path: DesignSystemPath;
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
export function DocBreadcrumb({ path }: DocBreadcrumbProps) {
  // `overview` names the root crumb, which the trail already carries, so it
  // resolves to `null` and the section level is skipped.
  const { sections } = getDesignSystemGroupLabels();
  const section = sections[getDesignSystemRouteSection(path)];

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
        { label: getDesignSystemRouteLabel(path) },
      ]}
    />
  );
}
