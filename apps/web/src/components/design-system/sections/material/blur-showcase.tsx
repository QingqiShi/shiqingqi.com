import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { CardDescription, CardTitle } from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/get-locale-path.ts";
import { getDesignSystemRouteDescriptions } from "../../route-copy/get-design-system-route-descriptions.ts";
import { getDesignSystemRouteLabel } from "../../route-copy/get-design-system-route-label.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

export function BlurShowcase() {
  const locale = getLocale();
  const descriptions = getDesignSystemRouteDescriptions();

  return (
    <Showcase
      label={t({ en: "Blur on the page", zh: "页面上的虚化" })}
      frame="plain"
    >
      <ShowcaseHelper>
        {t({
          en: "Glass blurs its own background. A floating element does not turn to glass for that: the page blurs around it instead, and a scroll region blurs its own edge. Both belong to the page rather than to the element, and both keep the element's edge crisp.",
          zh: "玻璃虚化的是它自己的背景。悬浮元素不会为此变成玻璃：页面在它周围虚化，滚动区域则虚化自己的边缘。两者都属于页面而非元素，也都让元素保持清晰的边界。",
        })}
      </ShowcaseHelper>

      <div css={styles.links}>
        <Link
          href={getLocalePath(
            "/design-system/components/progressive-blur",
            locale,
          )}
          {...stylex.props(
            flex.col,
            cardSurface.base,
            cardSurface.interactive,
            transition.colors,
            styles.card,
          )}
        >
          <CardTitle>
            {getDesignSystemRouteLabel(
              "/design-system/components/progressive-blur",
            )}
          </CardTitle>
          <CardDescription>
            {descriptions["/design-system/components/progressive-blur"]}
          </CardDescription>
        </Link>
        <Link
          href={getLocalePath("/design-system/components/scroll-mask", locale)}
          {...stylex.props(
            flex.col,
            cardSurface.base,
            cardSurface.interactive,
            transition.colors,
            styles.card,
          )}
        >
          <CardTitle>
            {getDesignSystemRouteLabel("/design-system/components/scroll-mask")}
          </CardTitle>
          <CardDescription>
            {descriptions["/design-system/components/scroll-mask"]}
          </CardDescription>
        </Link>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  links: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  // Matches `Card`'s own padding, which `cardSurface` doesn't carry.
  card: {
    gap: space._0,
    paddingBlock: space._3,
    paddingInline: space._3,
    textDecoration: "none",
    minInlineSize: 0,
  },
});
