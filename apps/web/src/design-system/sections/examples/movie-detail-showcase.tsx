import * as stylex from "@stylexjs/stylex";
import { Callout } from "@tuja/ui/components/callout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { measure } from "#src/design-system/measure.stylex.ts";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { MovieDetailExemplar } from "./movie-detail-exemplar.tsx";

interface LayerCardProps {
  title: string;
  description: string;
  /**
   * The entry points and props used at this layer. Identifiers, so they stay in
   * English in both locales.
   */
  entries: string[];
}

/** One of the three abstraction layers (props, slots, the pieces underneath), and what the screen took from it. */
function LayerCard({ title, description, entries }: LayerCardProps) {
  return (
    <Card css={styles.layerCard}>
      <CardHeader>
        <CardTitle level={3}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul css={[stack.tight, styles.entries]}>
          {entries.map((entry) => (
            <li key={entry} css={styles.entry}>
              {entry}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * The documentation around the exemplar: what it is, the screen itself, the
 * layer-by-layer account of where each part came from, and the source of the
 * hero.
 *
 * A server component, so only the screen and its annotation switch cross the
 * client boundary.
 */
export function MovieDetailShowcase() {
  return (
    <>
      <Callout
        intent="accent"
        title={t({ en: "Static, invented data", zh: "静态的虚构数据" })}
      >
        {t({
          en: "Every value on the screen below is invented and hard-coded. It makes no TMDB request, needs no API key, and renders the same offline. Nothing on it navigates, so nothing on it is dressed as a link: the Similar cards load their Movie into the screen, and the values that would take you elsewhere in a real app are Badges.",
          zh: "下方页面上的每个数据都是虚构并硬编码的。它不会请求 TMDB，不需要 API 密钥，离线也照样渲染。页面上没有任何跳转，因此也没有任何东西伪装成链接：相似影片卡片会把该影片载入本页面，而在真实应用中会把你带往别处的数据则一律是徽章。",
        })}
      </Callout>

      {/* Plain framing: the screen is the surface here, and a card around it
          would put one bordered panel inside another. */}
      <Showcase frame="plain" label={t({ en: "The screen", zh: "页面" })}>
        <MovieDetailExemplar />
      </Showcase>

      <Showcase label={t({ en: "What it composes", zh: "组成结构" })}>
        <div css={styles.layerGrid}>
          <LayerCard
            title={t({ en: "Chosen with props", zh: "用属性选择" })}
            description={t({
              en: "Nearly everything on the screen: a component and its props.",
              zh: "页面上的绝大多数内容：一个组件加上它的属性。",
            })}
            entries={[
              'Badge intent="accent" | "neutral" size="sm"',
              'Button look="primary" | "outline" isActive',
              'SegmentedControl size="sm"',
              "Select options labelHidden",
              'Text look tone weight numeric transform wrap="pretty"',
              "Heading level look",
              "Section level divider",
              'Disclosure look="card"',
              "Divider",
              "Avatar name size",
            ]}
          />
          <LayerCard
            title={t({ en: "Your own content", zh: "你自己的内容" })}
            description={t({
              en: "Props that take a node. The screen supplies the content; the component still places it and keeps its layout, state and accessibility.",
              zh: "接收节点的属性。页面提供内容，组件仍负责摆放它，并保留自己的布局、状态与无障碍。",
            })}
            entries={[
              "Button icon",
              "Badge icon",
              "Section actions",
              "Disclosure icon, trailing",
              "MenuButton buttonProps, menuContent",
              "Callout title, onDismiss",
              "Card header, description, content",
            ]}
          />
          <LayerCard
            title={t({ en: "Built by hand", zh: "自行构建" })}
            description={t({
              en: "Five things on this page have no component. They are built from Tokens, Primitives and a component's exported look, and still get the system's surfaces, focus rings and easing.",
              zh: "这里有五处没有对应组件。它们由令牌、原语与组件导出的外观搭建，同时仍沿用系统的表面、焦点环与缓动。",
            })}
            entries={[
              "cardSurface.base + .interactive on <button>",
              "transition.colors",
              "tokens.stylex — the poster plate",
              "tokens.stylex — the rating dial",
              "breakpoints.stylex — the hero grid",
            ]}
          />
        </div>
        <Text look="bodySmall" tone="muted" css={styles.note}>
          {t({
            en: "Three absences are worth as much as the list. No close button appears anywhere in the source — Callout supplies its own dismiss and Overlay its own close, so both arrive carrying the system's focus ring and hover easing without this file naming either. No Chip appears either: a Chip is a control, and the system's own rule is that a label which can't be clicked is a Badge, so on a screen with nothing to navigate to the Genres and the providers are Badges. And the movie database has no accounts, so the screen has no review form and therefore no TextField, Textarea, or Checkbox. A composed screen shows what a surface needs, not everything the system owns.",
            zh: "有三处「缺席」与上面的清单同样重要。源码中没有出现任何关闭按钮——Callout 自带关闭，Overlay 也自带关闭，两者都自然携带系统的焦点环与悬停缓动，而本文件从未提及它们。也没有出现 Chip：Chip 是控件，而系统自己的规则是「不能点击的标签就该用 Badge」，因此在这个无处可跳转的页面上，类型与观看渠道一律是徽章。此外，影视数据库没有账号体系，因此页面没有评论表单，也就没有 TextField、Textarea 或 Checkbox。一个组合页面呈现的是该界面所需要的东西，而非系统所拥有的全部。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`// A sketch of the shape, not a transcript of the screen — the source is
// movie-detail-screen.tsx, and a second full copy here would only drift.
//
// What it shows: local styles carry the grid and the plate width; the surface
// comes from the system's shared skin; everything inside is a component and
// its props.
<div css={[cardSurface.base, stack.item, styles.screen]}>
  <div css={styles.hero}>
    <TypesetPoster
      title={movie.title}
      studio={movie.studio}
      year={movie.year}
      credit={movie.director}
      lead
      css={styles.heroPoster}
    />
    <div css={[stack.item, styles.identity]}>
      <div css={cluster.tight}>
        <Badge intent="accent">Movie</Badge>
        <Text as="span" look="caption" tone="muted" numeric>
          {[movie.year, movie.runtime, movie.language].join(" · ")}
        </Text>
      </div>
      <div css={stack.tight}>
        <Heading level={3} look="h1" wrap="balance">{movie.title}</Heading>
        <Text tone="muted" wrap="pretty" css={styles.tagline}>{movie.tagline}</Text>
      </div>
    </div>
    <div css={[stack.item, styles.heroRest]}>
      <div css={cluster.tight}>
        {movie.genres.map((genre) => <Badge key={genre} size="sm">{genre}</Badge>)}
      </div>
      <div css={cluster.tight}>
        <Button look="primary" icon={<PlayIcon weight="fill" />} onClick={openTrailer}>
          Watch trailer
        </Button>
        <MenuButton
          buttonProps={{ look: "outline", icon: <ShareNetworkIcon weight="bold" /> }}
          menuContent={shareItems.map((item) => (
            <Button key={item.label} role="menuitem" look="ghost" icon={item.icon}>
              {item.label}
            </Button>
          ))}
        >
          Share
        </MenuButton>
      </div>
    </div>
  </div>
</div>`}
          label="tsx"
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  // The one place on the site that lays out cards rather than specimens, so the
  // grid lives here rather than as a shared component with a single caller.
  layerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: rhythm.item,
  },
  // Stretched, so the three layer cards in a row end level with each other
  // however unevenly their lists run.
  layerCard: {
    blockSize: "100%",
  },
  entries: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  // Monospace and unmarked: these are import and prop names, and a bullet in
  // front of each one would read as prose about the system rather than a list
  // drawn from its API.
  entry: {
    color: color.fgMuted,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
    // Not `anywhere`, which would break a name mid-word while the line still
    // had room at the preceding space. The name is what a reader came to copy.
    overflowWrap: "break-word",
  },
  note: {
    maxInlineSize: measure.prose,
  },
});
