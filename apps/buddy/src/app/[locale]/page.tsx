import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { DemoScene } from "#src/home-page/demo-scene.tsx";
import { INSTALL_ID, InstallGuide } from "#src/home-page/install-guide.tsx";
import { PanelPicture } from "#src/home-page/panel-picture.tsx";
import { readDemoPetState } from "#src/home-page/read-demo-pet-state.ts";
import { Anchor } from "#src/links/anchor.tsx";
import { CornerLink } from "#src/owner-page/corner-link.tsx";
import { petPageColumn } from "#src/owner-page/pet-page-column.stylex.ts";
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

  return (
    <main>
      <DemoScene
        initialState={demo.state}
        renderedAt={renderedAt}
        isLive={demo.isLive}
      >
        <CornerLink side="start" href={getLocalePath("/", locale)} isWordmark>
          {t({ en: "Buddy", zh: "搭子" })}
        </CornerLink>
        {account ? null : (
          <CornerLink side="end" href={getLocalePath("/sign-in", locale)}>
            {t({ en: "Sign in", zh: "登录" })}
          </CornerLink>
        )}
      </DemoScene>
      <div css={[pageColumn.base, petPageColumn.content]}>
        <div css={[stack.section, petPageColumn.column, petPageColumn.narrow]}>
          <Text look="caption" tone="muted" css={styles.caption}>
            {demo.isLive ? (
              <>
                {fillTemplate(
                  t({
                    en: "@{user}'s Miao, live from their Mac.",
                    zh: "这是 @{user} 的小苗，正和 Mac 实时同步。",
                  }),
                  { user: demo.state.user },
                )}{" "}
                <Anchor href={getLocalePath(`/u/${demo.state.user}`, locale)}>
                  {t({ en: "Visit", zh: "去看看" })}
                </Anchor>
              </>
            ) : (
              t({ en: "A sample Miao.", zh: "一只示例小苗。" })
            )}
          </Text>
          <div css={stack.group}>
            <div css={stack.tight}>
              <Heading level={1} look="h1">
                {t({
                  en: "Miao, a pet raised in Claude Code",
                  zh: "小苗，养在 Claude Code 里的宠物",
                })}
              </Heading>
              <div css={stack.item}>
                <Text>
                  {t({
                    en: "Every token you spend grows it a little, and when your quota runs low it worries before you do. It lives in a pane beside Claude Code on your Mac.",
                    zh: "你每花一个 token，它就长大一点；额度快用完时，它比你先着急。它住在 Mac 上 Claude Code 旁边的面板里。",
                  })}
                </Text>
                <Text>
                  {t({
                    en: "Connect it to Buddy and it also moves in to a page on your phone: awake or asleep, how far it has grown, how much quota is left, whenever you look.",
                    zh: "连上搭子，它也会住到你手机上的一页：醒着还是睡了、长到了哪一级、额度还剩多少，随时能看。",
                  })}
                </Text>
              </div>
            </div>
            <PanelPicture />
            <div css={cluster.item}>
              {account ? (
                <Button
                  href={getLocalePath(`/u/${account.name}`, locale)}
                  look="primary"
                >
                  {t({ en: "See your Miao", zh: "去看看你的小苗" })}
                </Button>
              ) : (
                <Button href={getLocalePath("/sign-in", locale)} look="primary">
                  {t({ en: "Sign in or sign up", zh: "登录或注册" })}
                </Button>
              )}
              <Anchor href={`${getLocalePath("/", locale)}#${INSTALL_ID}`}>
                {t({ en: "How to install it on a Mac", zh: "怎么装到 Mac 上" })}
              </Anchor>
            </div>
          </div>
          <InstallGuide />
        </div>
      </div>
    </main>
  );
}

const styles = stylex.create({
  caption: {
    textAlign: "center",
  },
});
