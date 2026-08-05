import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocBreadcrumb } from "./doc-breadcrumb.tsx";
import { measure } from "./measure.stylex.ts";
import { getDesignSystemRouteLabel } from "./route-copy.ts";
import type { DesignSystemPath } from "./routes.ts";

interface DocPageProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
  description: ReactNode;
  children: ReactNode;
}

/**
 * Shared header + body frame for a single design-system entry — one foundation,
 * component, or composed example per route. Renders the breadcrumb, the
 * page-level `h1` and intro, then a consistent content column the showcases
 * flow into.
 */
export function DocPage({ path, description, children }: DocPageProps) {
  return (
    <article css={styles.page}>
      <header css={styles.header}>
        <DocBreadcrumb path={path} />
        {/* Its own column: the trail is chrome above the page, and sharing the
            header's gap would set it as an over-line on the title. */}
        <div css={styles.intro}>
          <h1 css={styles.title}>{getDesignSystemRouteLabel(path)}</h1>
          <p css={styles.description}>{description}</p>
        </div>
      </header>
      <div css={styles.body}>{children}</div>
    </article>
  );
}

const styles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: space._6,
    maxInlineSize: measure.reading,
    marginInline: "auto",
  },
  // The rule is what gives the page a masthead. Without it the title and intro
  // sit on the bare ground and the first showcase card is the only edge on the
  // page, so the header reads as something that fell off the top of the stack
  // rather than as the page's own head. It matches the rule the overview's
  // category headings carry, so the two pages share one horizontal.
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    paddingBlockEnd: space._4,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.neutralBorder,
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  title: {
    margin: 0,
    fontSize: font.uiSubDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
    color: color.textMain,
    textWrap: "balance",
  },
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
});
