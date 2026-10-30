import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import {
  Breadcrumb,
  type BreadcrumbLinkProps,
} from "@tuja/ui/components/breadcrumb";
import { getDesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import { getDesignSystemRouteSection } from "#src/design-system/routes/get-design-system-route-section.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { Link } from "#src/links/link.tsx";

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
      css={styles.breadcrumb}
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

const styles = stylex.create({
  breadcrumb: {
    paddingInlineEnd: "var(--header-controls-inline-end-clearance, 0px)",
  },
});
