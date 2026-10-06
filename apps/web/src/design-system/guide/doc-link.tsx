import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { Anchor } from "#src/links/anchor.tsx";

/** An inline link to another design-system page, named by that page's label. */
export function DocLink({ path }: { path: DesignSystemPath }) {
  return (
    <Anchor href={getLocalePath(path, getLocale())}>
      {getDesignSystemRouteLabel(path)}
    </Anchor>
  );
}
