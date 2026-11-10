import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Link } from "@tuja/next-links/link";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { pageColumn, pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  controlHeight,
  font,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";
import { DemoScene } from "#src/home-page/demo-scene.tsx";
import {
  INSTALL_ID,
  InstallGuide,
  MOD_URL,
} from "#src/home-page/install-guide.tsx";
import { outlineEdge } from "#src/home-page/outline-edge.stylex.ts";
import { paneCrop } from "#src/home-page/pane-crop.stylex.ts";
import { PanelPicture } from "#src/home-page/panel-picture.tsx";
import { readDemoPetState } from "#src/home-page/read-demo-pet-state.ts";
import { Anchor } from "#src/links/anchor.tsx";
import { CornerLink } from "#src/owner-page/corner-link.tsx";
import { petPageColumn } from "#src/owner-page/pet-page-column.stylex.ts";
import { sceneHeight, sceneTokens } from "#src/owner-page/scene.stylex.ts";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { getPageAccount } from "#src/server/account/get-page-account.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return {
    description: t({
      en: "Miao, a pet raised in Claude Code, live on your phone.",
      zh: "小苗，养在 Claude Code 里的宠物，手机上随时能看。",
    }),
  };
}

/**
 * The doorway, for someone who has never seen Miao: the pet itself first, in the same window as
 * on its own page, then what it is, where it lives on the Mac, and the one thing to do next.
 */
export default async function HomePage({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const renderedAt = new Date().getTime();
  const [account, demo] = await Promise.all([
    getPageAccount(),
    readDemoPetState(renderedAt),
  ]);

  const homeHref = getLocalePath("/", locale);
  const installHref = `${homeHref}#${INSTALL_ID}`;
  const signInHref = getLocalePath("/sign-in", locale);
  const wordmark = t({ en: "Buddy", zh: "搭子" });
  const signInLabel = t({ en: "Sign in", zh: "登录" });
  const headerLink = [
    a11y.touchTarget,
    a11y.focusRing,
    typeRole.label,
    styles.headerLink,
  ];

  return (
    <>
      <header css={[pageColumn.base, styles.header]}>
        <Link href={homeHref} {...stylex.props(headerLink, styles.wordmark)}>
          {wordmark}
        </Link>
        {account ? null : (
          <Link href={signInHref} {...stylex.props(headerLink)}>
            {signInLabel}
          </Link>
        )}
      </header>
      <main css={[pageColumn.base, styles.main]}>
        <div css={stack.section}>
          <div css={styles.hero}>
            <div css={styles.phone}>
              <div css={styles.phoneFrame}>
                <div css={styles.phoneScreen}>
                  <DemoScene
                    initialState={demo.state}
                    renderedAt={renderedAt}
                    isLive={demo.isLive}
                    css={styles.banner}
                  >
                    <div css={styles.sceneMarks}>
                      <CornerLink side="start" href={homeHref} isWordmark>
                        {wordmark}
                      </CornerLink>
                      {account ? null : (
                        <CornerLink side="end" href={signInHref}>
                          {signInLabel}
                        </CornerLink>
                      )}
                    </div>
                  </DemoScene>
                </div>
              </div>
              <Text look="caption" tone="muted" css={styles.caption}>
                {demo.isLive ? (
                  <>
                    {fillTemplate(
                      t({
                        en: "@{user}'s Miao page, live.",
                        zh: "@{user} 的小苗页面，实时同步。",
                      }),
                      { user: demo.state.user },
                    )}{" "}
                    <Anchor
                      href={getLocalePath(`/u/${demo.state.user}`, locale)}
                    >
                      {t({ en: "Visit", zh: "去看看" })}
                    </Anchor>
                  </>
                ) : (
                  t({
                    en: "Sample: Miao's page on your phone",
                    zh: "示例：手机上的小苗页面",
                  })
                )}
              </Text>
            </div>
            <div css={[stack.group, styles.intro]}>
              <div css={stack.item}>
                <Heading level={1} look="display">
                  {t({
                    en: "Miao, a pet raised in Claude\u00A0Code",
                    zh: "小苗，养在 Claude\u00A0Code 里的宠物",
                  })}
                </Heading>
                <Text>
                  {t({
                    en: "Every token you spend grows it a little, and when your quota runs low it worries before you do. It lives beside Claude Code on your Mac, and Buddy brings it to your phone.",
                    zh: "你每花一个 token，它就长大一点；额度快用完时，它比你先着急。它住在 Mac 上的 Claude Code 旁边，连上搭子，手机上也能看。",
                  })}
                </Text>
              </div>
              {account ? (
                <div css={[cluster.item, styles.actions]}>
                  <Button
                    href={getLocalePath(`/u/${account.name}`, locale)}
                    look="primary"
                  >
                    {t({ en: "See your Miao", zh: "去看看你的小苗" })}
                  </Button>
                  <Anchor href={installHref}>
                    {t({
                      en: "How to install it on a Mac",
                      zh: "怎么装到 Mac 上",
                    })}
                  </Anchor>
                </div>
              ) : (
                <div css={cluster.item}>
                  <Button href={installHref} look="primary">
                    {t({ en: "Install on your Mac", zh: "装到 Mac 上" })}
                  </Button>
                </div>
              )}
            </div>
            <div css={styles.pane}>
              <PanelPicture />
            </div>
          </div>
          <InstallGuide
            syncAction={
              account ? null : (
                <Button
                  href={signInHref}
                  look="outline"
                  css={outlineEdge.control}
                >
                  {t({ en: "Sign in or sign up", zh: "登录或注册" })}
                </Button>
              )
            }
          />
        </div>
      </main>
      <footer css={pageColumn.base}>
        <div css={[petPageColumn.content, styles.footerRow]}>
          <Text as="span" look="caption" tone="muted">
            <Anchor href={MOD_URL} target="_blank" tone="muted">
              {t({ en: "Source on GitHub", zh: "源码在 GitHub" })}
            </Anchor>
          </Text>
        </div>
      </footer>
    </>
  );
}

const PHONE_RADIUS = border.radius_4;
const BEZEL = space._1;
const SCREEN_HEIGHT = "30rem";
/** The width at which the pane's crop is as tall as the phone. */
const PANE_WIDTH = `calc((${SCREEN_HEIGHT} + 2 * (${BEZEL} + ${border.size_1})) * ${paneCrop.aspectRatio})`;

const styles = stylex.create({
  // On a phone the scene is the top of the page and holds the wordmark and
  // Sign in. From `lg` the scene is a picture in the hero, so the two links
  // go in this row.
  header: {
    display: { default: "none", [breakpoints.lg]: "flex" },
    alignItems: "center",
    justifyContent: "space-between",
    paddingBlockStart: space._5,
  },
  headerLink: {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: controlHeight.sm,
    color: color.fgMuted,
    textDecoration: {
      default: "none",
      ":hover": { default: null, [pointer.canHover]: "underline" },
    },
  },
  wordmark: {
    color: color.fg,
    fontWeight: font.weight_6,
  },
  main: {
    paddingBlockStart: { default: 0, [breakpoints.lg]: rhythm.section },
    paddingBlockEnd: rhythm.section,
  },
  // The pane column makes the pane as tall as the phone, so the two captions
  // align.
  hero: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: `minmax(0, 1fr) ${PANE_WIDTH} 17rem`,
    },
    alignItems: "start",
    columnGap: { default: null, [breakpoints.lg]: rhythm.item },
  },
  // Below `lg` the page column is the page gutter, so this margin takes the
  // scene to the edges of the screen.
  phone: {
    gridColumn: { default: null, [breakpoints.lg]: 3 },
    gridRow: { default: null, [breakpoints.lg]: 1 },
    position: "relative",
    zIndex: 1,
    marginInlineStart: {
      default: `calc(-1 * ${pageGutter.inlineStart})`,
      [breakpoints.lg]: 0,
    },
    marginInlineEnd: {
      default: `calc(-1 * ${pageGutter.inlineEnd})`,
      [breakpoints.lg]: 0,
    },
  },
  phoneFrame: {
    padding: { default: 0, [breakpoints.lg]: BEZEL },
    backgroundColor: { default: null, [breakpoints.lg]: color.bgSurface },
    borderWidth: { default: 0, [breakpoints.lg]: border.size_1 },
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: { default: 0, [breakpoints.lg]: PHONE_RADIUS },
    cornerShape: "squircle",
    boxShadow: { default: null, [breakpoints.lg]: shadow._4 },
  },
  phoneScreen: {
    blockSize: { default: null, [breakpoints.lg]: SCREEN_HEIGHT },
    overflow: { default: null, [breakpoints.lg]: "hidden" },
    borderRadius: {
      default: 0,
      [breakpoints.lg]: `calc(${PHONE_RADIUS} - ${BEZEL})`,
    },
    cornerShape: "squircle",
  },
  // On a phone the scene is shorter, so that the content comes up. From `lg`
  // it fills the phone's screen, which is not the page, so the ground does
  // not fade.
  banner: {
    blockSize: {
      default: `calc(env(safe-area-inset-top) + 17rem)`,
      [breakpoints.md]: sceneHeight.wide,
      [breakpoints.lg]: "100%",
    },
    [sceneTokens.seamFade]: { default: null, [breakpoints.lg]: "transparent" },
  },
  caption: {
    marginInline: "auto",
    marginBlockStart: rhythm.tight,
    paddingInlineStart: {
      default: pageGutter.inlineStart,
      [breakpoints.lg]: 0,
    },
    paddingInlineEnd: { default: pageGutter.inlineEnd, [breakpoints.lg]: 0 },
    textAlign: "center",
  },
  sceneMarks: {
    display: { default: "contents", [breakpoints.lg]: "none" },
  },
  // On a phone the gap is one step smaller, so that the hero's button shows
  // before a scroll.
  intro: {
    gridColumn: { default: null, [breakpoints.lg]: 1 },
    gridRow: { default: null, [breakpoints.lg]: 1 },
    alignSelf: { default: null, [breakpoints.lg]: "center" },
    marginBlockStart: {
      default: rhythm.group,
      [breakpoints.md]: rhythm.section,
      [breakpoints.lg]: 0,
    },
    paddingInlineEnd: { default: 0, [breakpoints.lg]: rhythm.section },
  },
  pane: {
    gridColumn: { default: null, [breakpoints.lg]: 2 },
    gridRow: { default: null, [breakpoints.lg]: 1 },
    marginBlockStart: { default: rhythm.section, [breakpoints.lg]: 0 },
  },
  actions: {
    flexDirection: { default: "column", [breakpoints.md]: "row" },
    alignItems: { default: "start", [breakpoints.md]: "center" },
    rowGap: rhythm.tight,
  },
  footerRow: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
});
