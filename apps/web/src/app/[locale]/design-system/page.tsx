import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, measure } from "@tuja/ui/tokens.stylex";
import {
  OverviewBrowser,
  type OverviewEntry,
} from "#src/design-system/overview-browser.tsx";
import { OverviewTile } from "#src/design-system/overview-tile.tsx";
import { getDesignSystemGroupLabels } from "#src/design-system/route-copy/get-design-system-group-labels.ts";
import { getDesignSystemRouteDescriptions } from "#src/design-system/route-copy/get-design-system-route-descriptions.ts";
import { getDesignSystemRouteLabels } from "#src/design-system/route-copy/get-design-system-route-labels.ts";
import { DESIGN_SYSTEM_ROUTES } from "#src/design-system/routes/design-system-routes.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";

export default function DesignSystemOverview() {
  const locale = getLocale();
  const heading = t({ en: "Design System", zh: "设计系统" });
  const routeLabels = getDesignSystemRouteLabels();
  const tileDescriptions = getDesignSystemRouteDescriptions();

  // Names, blurbs and structure all come from `route-copy/` and the route
  // registry. The overview lists everything except itself. Tiles are built
  // here, on the server, and handed to the browser as ready-made nodes: it
  // only ever reorders and filters them, so the two dozen live specimens
  // never reach the client bundle.
  const routes = DESIGN_SYSTEM_ROUTES.filter(
    (route) => route.path !== "/design-system",
  );
  const entries: OverviewEntry[] = routes.map((route) => ({
    path: route.path,
    label: routeLabels[route.path],
    tile: (
      <OverviewTile
        path={route.path}
        href={getLocalePath(route.path, locale)}
        label={routeLabels[route.path]}
        description={tileDescriptions[route.path]}
      />
    ),
  }));
  const collator = new Intl.Collator(locale);
  const alphabeticalOrder = entries
    .map((entry) => entry.path)
    .toSorted((a, b) => collator.compare(routeLabels[a], routeLabels[b]));

  return (
    <div css={stack.section}>
      <header css={stack.tight}>
        <h1 css={[typeRole.fluidDisplay, styles.heading]}>{heading}</h1>
        <p css={[typeRole.fluidLead, styles.intro]}>
          {t({
            en: "Tokens, primitives, and components that compose a refined visual language. Browse them by the job they do or by name — or search for the one you already have in mind.",
            zh: "构成精致视觉语言的设计令牌、原语与组件。可按用途或名称浏览，也可直接搜索你想找的内容。",
          })}
        </p>
      </header>

      <OverviewBrowser
        entries={entries}
        alphabeticalOrder={alphabeticalOrder}
        groupLabels={getDesignSystemGroupLabels()}
      />
    </div>
  );
}

const styles = stylex.create({
  heading: {
    margin: 0,
    textWrap: "balance",
  },
  intro: {
    margin: 0,
    color: color.fgMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
