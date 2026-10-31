import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { Fragment, type ReactNode } from "react";
import { getDesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { DESIGN_SYSTEM_ROUTES } from "#src/design-system/routes/design-system-routes.ts";
import type { DesignSystemSectionId } from "#src/design-system/routes/types.ts";
import { Anchor } from "#src/links/anchor.tsx";

function countRoutes(section: DesignSystemSectionId) {
  return DESIGN_SYSTEM_ROUTES.filter((route) => route.section === section)
    .length;
}

interface Layer {
  section: Exclude<DesignSystemSectionId, "overview">;
  what: ReactNode;
  /** The public import paths that show the shape of the layer. */
  paths: string[];
}

/**
 * The whole system in one picture: the three layers in the order of the nav
 * rail, how many pages each holds, what it is, and the import path that
 * shows its shape. Each layer name links to its group on the Overview. The
 * counts come from the route registry, so a new page moves them.
 */
export function GetStartedLayers() {
  const locale = getLocale();
  const { sections } = getDesignSystemGroupLabels();
  const labCount = DESIGN_SYSTEM_ROUTES.filter(
    (route) => route.lab === true,
  ).length;
  const layers: Layer[] = [
    {
      section: "foundations",
      what: t({
        en: "The decisions, such as colour, type, layout and motion.",
        zh: "设计决策，例如颜色、文字、布局与动效。",
      }),
      paths: ["@tuja/ui/tokens.stylex"],
    },
    {
      section: "components",
      what: (
        <>
          {t({ en: "The parts. ", zh: "零件。其中 " })}
          {labCount}
          {t({
            en: " of them have a Lab, where you change props live.",
            zh: " 个有实验室，可以实时改动属性。",
          })}
        </>
      ),
      paths: ["@tuja/ui/components/button"],
    },
    {
      section: "composition",
      what: t({
        en: "Primitives, hooks, the WebGPU effect layer, and one full example page.",
        zh: "原语、钩子、WebGPU 效果层，以及一个完整的示例页面。",
      }),
      paths: ["@tuja/ui/primitives/stack.stylex", "@tuja/ui/hooks/use-ripple"],
    },
  ];
  const overviewPath = getLocalePath("/design-system", locale);
  const unit = t({ en: "pages", zh: "页" });

  return (
    <ol css={styles.layers}>
      {layers.map(({ section, what, paths }) => (
        <li key={section} css={styles.layer}>
          <div css={stack.tight}>
            <span css={[typeRole.h1, typeModifier.numeric, styles.count]}>
              {countRoutes(section)}
            </span>
            <span css={[typeRole.caption, styles.unit]}>{unit}</span>
          </div>
          <div css={stack.text}>
            <Anchor
              href={`${overviewPath}#${section}`}
              css={[typeRole.h3, styles.name]}
            >
              {sections[section]}
            </Anchor>
            <Text tone="muted">{what}</Text>
            <span css={[typeRole.bodySmall, styles.paths]}>
              {paths.map((path) => (
                <code key={path} css={styles.path}>
                  {path.split("/").map((segment, index) => (
                    <Fragment key={`${String(index)}-${segment}`}>
                      {index > 0 ? (
                        <>
                          /<wbr />
                        </>
                      ) : null}
                      {segment}
                    </Fragment>
                  ))}
                </code>
              ))}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

const styles = stylex.create({
  layers: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.group,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  // The count sits on the baseline of the name, like a drop figure.
  layer: {
    display: "grid",
    gridTemplateColumns: "4.5rem minmax(0, 1fr)",
    columnGap: rhythm.item,
    alignItems: "baseline",
  },
  count: {
    color: color.fg,
  },
  unit: {
    color: color.fgMuted,
  },
  name: {
    alignSelf: "flex-start",
    color: color.fg,
  },
  paths: {
    display: "flex",
    flexDirection: "column",
    marginBlockStart: rhythm.tight,
    color: color.fgMuted,
  },
  path: {
    fontFamily: font.familyMono,
  },
});
