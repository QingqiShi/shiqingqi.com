import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { GhostIcon } from "@phosphor-icons/react/dist/ssr/Ghost";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { CardDescription, CardTitle } from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { align, flex, justify } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { AnchorButton } from "#src/components/shared/anchor-button.tsx";
import { SiteHeaderFooterLayout } from "#src/components/shared/site-header-footer-layout.tsx";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

/**
 * The site's 404: what happened, then somewhere to go. Rendered by both
 * `not-found.tsx` files, and it owns the Shell so the two cannot drift apart on
 * chrome or on the header clearance the chrome forces.
 *
 * Deliberately a Server Component. `not-found.tsx` is not one of the page/layout
 * entry points the i18n Codegen traces, so it gets no client Bundle — every
 * Translation here has to compile to the server lookup, and any client component
 * it renders has to take its copy as a prop (as the header chrome already does).
 * That also rules out the app's `Card`, which calls `t()` internally, hence
 * composing the destination links from `cardSurface` — the escape hatch
 * `@tuja/ui`'s `Card` documents for a card that is a link.
 *
 * The Locale comes from the server locale store, the same source the server
 * `t()` lookup reads, so the copy and the localized hrefs cannot disagree.
 */
export function NotFoundScreen() {
  const locale = getLocale();

  // Deliberately the same `t()` pairs the home page's Projects use, so the two
  // surfaces read identically and the Keys dedupe in the Bundle. They are two
  // copies of the strings, though — there is no Project registry to share, so
  // editing one side means editing the other.
  const destinations = [
    {
      href: getLocalePath("/movie-database", locale),
      icon: <FilmSlateIcon size={28} weight="fill" aria-hidden="true" />,
      name: t({ en: "Movie Database", zh: "电影数据库" }),
      description: t({
        en: "Chat with AI to find your next watch, or browse what's trending.",
        zh: "让 AI 帮你找下一部佳片，或浏览当下热门。",
      }),
    },
    {
      href: getLocalePath("/pixel-creature-creator", locale),
      icon: <GhostIcon size={28} weight="fill" aria-hidden="true" />,
      name: t({ en: "Pixel Creature Creator", zh: "像素生物创造器" }),
      description: t({
        en: "Build a tiny pixel creature, name it, and conjure its lore.",
        zh: "搭建一个小像素生物，给它取名，并召唤它的传说。",
      }),
    },
    {
      href: getLocalePath("/design-system", locale),
      icon: <PackageIcon size={28} weight="fill" aria-hidden="true" />,
      name: t({ en: "Design System", zh: "设计系统" }),
      description: t({
        en: "A refined visual language, crafted with care.",
        zh: "精心打造的精致视觉语言。",
      }),
    },
  ];

  return (
    <SiteHeaderFooterLayout locale={locale} readingColumn>
      <div css={[flex.col, justify.center, styles.screen]}>
        <div css={[flex.col, align.center, styles.intro]}>
          <Text as="div" variant="overline" tone="muted">
            404
          </Text>
          <Heading level={1} variant="h1" align="center" wrap="balance">
            {t({ en: "This page doesn't exist", zh: "该页面不存在" })}
          </Heading>
          <Text tone="muted" align="center" wrap="pretty" css={styles.lede}>
            {t({
              en: "The link may be out of date, or the page may have moved. Everything else still works.",
              zh: "链接可能已失效，或页面已移动。其余内容都还在。",
            })}
          </Text>
          <AnchorButton
            href={getLocalePath("/", locale)}
            bright
            icon={<HouseIcon weight="bold" role="presentation" />}
          >
            {t({ en: "Back to home", zh: "返回首页" })}
          </AnchorButton>
        </div>

        <nav
          css={styles.destinations}
          aria-label={t({ en: "Other places to go", zh: "其他去处" })}
        >
          {destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              {...stylex.props(
                flex.col,
                cardSurface.base,
                cardSurface.interactive,
                transition.colors,
                styles.destination,
              )}
            >
              <span css={styles.destinationIcon}>{destination.icon}</span>
              {/* `level={2}` keeps the outline honest under the screen's `h1`. */}
              <CardTitle level={2}>{destination.name}</CardTitle>
              <CardDescription>{destination.description}</CardDescription>
            </Link>
          ))}
        </nav>
      </div>
    </SiteHeaderFooterLayout>
  );
}

const styles = stylex.create({
  screen: {
    gap: space._8,
    // Fills the viewport and centres the block in it, so a screen this short
    // doesn't sit in a column of dead space. The block start padding clears the
    // Shell's floating header controls, which content otherwise flows past —
    // same `space._10 + safe-area` expression their own strip uses.
    minBlockSize: "100dvh",
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top) + ${space._5})`,
    paddingBlockEnd: space._9,
  },
  intro: {
    gap: space._3,
  },
  lede: {
    maxInlineSize: "34ch",
  },
  destinations: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(3, 1fr)",
    },
    gap: space._3,
  },
  // Matches `Card`'s own padding, which `cardSurface` doesn't carry.
  destination: {
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._4,
    textDecoration: "none",
  },
  destinationIcon: {
    color: color.accentText,
    lineHeight: font.lineHeight_0,
  },
});
