import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { FEATURED_CREATURES } from "../featured-creatures";
import { PixelSprite } from "../sprite/pixel-sprite";
import { encodeCreature } from "../state/encode-decode";

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
    <section css={styles.root} data-testid="featured-row">
      <header css={styles.header}>
        <h2 css={styles.heading}>{heading}</h2>
        <p css={styles.description}>{description}</p>
      </header>
      <ul css={styles.list}>
        {FEATURED_CREATURES.map((featured) => {
          const hash = encodeCreature(featured.def);
          const href = `${localePrefix}/pixel-creature-creator/c#${hash}`;
          return (
            <li key={featured.labelKey} css={styles.item}>
              <a
                href={href}
                css={styles.link}
                aria-label={featured.def.name}
                data-testid={`featured-${featured.labelKey}`}
              >
                <span css={styles.spriteSlot} aria-hidden="true">
                  <PixelSprite def={featured.def} scale={4} />
                </span>
                <span css={styles.name}>{featured.def.name}</span>
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
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    width: "100%",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  heading: {
    margin: 0,
    fontSize: font.vpHeading2,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
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
    gap: space._3,
  },
  item: {
    display: "flex",
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._1,
    padding: space._3,
    width: "100%",
    color: color.textMain,
    textDecoration: "none",
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
      ":focus-visible": color.backgroundHover,
    },
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: "16px",
    transitionProperty: "background-color, transform",
    transitionDuration: "160ms",
    transform: {
      default: null,
      ":hover": "translate3d(0, -2px, 0)",
    },
    outlineOffset: "2px",
  },
  spriteSlot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "8rem",
  },
  name: {
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
});
