import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { SupportedLocale } from "@tuja/i18n/types";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import {
  motionConstants,
  duration,
  easing,
} from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { encodeCreature } from "#src/pixel-creature-creator/creature/encode-creature.ts";
import { FEATURED_CREATURES } from "#src/pixel-creature-creator/featured-creatures.ts";
import { PixelSprite } from "#src/pixel-creature-creator/sprite/pixel-sprite.tsx";

interface FeaturedRowProps {
  locale: SupportedLocale;
}

/**
 * Landing-page featured row. Renders four hand-curated creatures as live
 * pixel sprites. Each card links to the review screen at `/c#<encoded>`
 * so visitors can explore a creature without first walking the wizard.
 *
 * Server component — `PixelSprite` is the only piece that needs the
 * client (it owns the rAF loop) but Next can transparently nest a client
 * component inside a server one.
 */
export function FeaturedRow({ locale }: FeaturedRowProps) {
  const localePrefix = locale === "en" ? "/en" : "/zh";
  const heading = t({ en: "Featured creatures", zh: "精选生物" });
  const description = t({
    en: "A few we cooked up earlier — pick one to peek at its card.",
    zh: "我们提前做的几只 —— 点开一只看看它的卡牌。",
  });

  return (
    <section css={[stack.item, styles.root]} data-testid="featured-row">
      <header css={stack.tight}>
        <h2 css={[typeRole.fluidH2, styles.heading]}>{heading}</h2>
        <p css={[typeRole.body, styles.description]}>{description}</p>
      </header>
      <ul css={styles.list}>
        {FEATURED_CREATURES.map((featured) => {
          const hash = encodeCreature(featured.def);
          const href = `${localePrefix}/pixel-creature-creator/c#${hash}`;
          return (
            <li key={featured.labelKey} css={styles.item}>
              <a
                href={href}
                css={[cardSurface.base, a11y.focusRing, styles.link]}
                aria-label={featured.def.name}
                data-testid={`featured-${featured.labelKey}`}
              >
                <span css={styles.spriteSlot} aria-hidden="true">
                  <PixelSprite def={featured.def} scale={4} />
                </span>
                <span css={[typeRole.h4, styles.name]}>
                  {featured.def.name}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const styles = stylex.create({
  root: {
    width: "100%",
  },
  heading: {
    margin: 0,
    color: color.fg,
  },
  description: {
    margin: 0,
    color: color.fgMuted,
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(4, minmax(0, 1fr))",
    },
    gap: rhythm.item,
  },
  item: {
    display: "flex",
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._3,
    width: "100%",
    color: color.fg,
    textDecoration: "none",
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
      ":focus-visible": color.bgControlHover,
    },
    transition: {
      default: `background-color ${duration._150} ${easing.ease}, transform ${duration._400} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `background-color ${duration._150} ${easing.ease}`,
    },
    transform: {
      default: null,
      ":hover": {
        default: null,
        [pointer.canHover]: "translate3d(0, -2px, 0)",
      },
    },
  },
  spriteSlot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "8rem",
  },
  name: {
    color: color.fg,
  },
});
