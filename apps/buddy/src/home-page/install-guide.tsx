import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { CopyBlock } from "./copy-block.tsx";

/** The fragment of the guide, which the pet page's first-run card links to. */
export const INSTALL_ID = "install";

const REPO_URL = "https://github.com/QingqiShi/claude";
export const MOD_URL = `${REPO_URL}/tree/main/mods/sprout`;
const MOD_DIR = "~/.claude/mods/sprout";
const CLONE_COMMANDS = [
  `git clone --depth 1 ${REPO_URL} /tmp/qingqi-claude`,
  "mkdir -p ~/.claude/mods",
  `cp -R /tmp/qingqi-claude/mods/sprout ${MOD_DIR}`,
].join("\n");
const SETTINGS_SNIPPET = JSON.stringify(
  { env: { CLAUDE_CODE_PLUGIN_DIRS: MOD_DIR } },
  null,
  2,
);

/**
 * How to get Miao onto a phone, in two steps: install the mod on the Mac, by Claude's hand or by
 * one's own, then sync. People read this on the phone and do it on the Mac, so every line can be
 * copied.
 */
export function InstallGuide({ syncAction }: { syncAction: ReactNode }) {
  return (
    <section id={INSTALL_ID} css={[stack.group, styles.section]}>
      <div css={[stack.item, styles.intro]}>
        <Heading level={2} css={typeRole.subDisplay}>
          {t({ en: "Set up Miao in two steps", zh: "两步装好小苗" })}
        </Heading>
        <Text>
          {t({
            en: "Miao is a Claude Code mod that you install on your own Mac. Reading this on your phone is fine: do it when you are at your Mac.",
            zh: "小苗是一个 Claude Code mod，装在你自己的 Mac 上。在手机上看到这里也没关系，到了 Mac 前再做。",
          })}
        </Text>
      </div>
      <div css={styles.steps}>
        <div css={stack.item}>
          <div css={stack.tight}>
            <Heading level={3} look="h2">
              {t({ en: "1. Install on your Mac", zh: "1. 装到 Mac 上" })}
            </Heading>
            <Text>
              {t({
                en: "Let Claude install it for you: copy this message and send it to Claude Code on your Mac.",
                zh: "让 Claude 替你装：复制这段话，发给 Mac 上的 Claude Code。",
              })}
            </Text>
          </div>
          <CopyBlock
            kind="message"
            label={t({
              en: "Message to Claude Code",
              zh: "发给 Claude Code 的消息",
            })}
            text={t({
              en: "Install Miao for me: copy the folder `mods/sprout` from the repository `https://github.com/QingqiShi/claude` to `~/.claude/mods/sprout`, then in `~/.claude/settings.json` add `~/.claude/mods/sprout` to `CLAUDE_CODE_PLUGIN_DIRS` under `env` (after a colon if it already has a value). When it is done, remind me to restart Claude Code.",
              zh: "帮我装小苗：把 `https://github.com/QingqiShi/claude` 这个仓库里的 `mods/sprout` 文件夹复制到 `~/.claude/mods/sprout`，然后在 `~/.claude/settings.json` 的 `env` 里把 `~/.claude/mods/sprout` 加进 `CLAUDE_CODE_PLUGIN_DIRS`（已经有值的话用英文冒号接在后面）。装好后提醒我重启 Claude Code。",
            })}
          />
          <Disclosure
            css={typeRole.body}
            summary={t({ en: "Or install it by hand", zh: "或者自己动手装" })}
          >
            <ol css={[stack.item, styles.list]}>
              <li>
                <div css={stack.tight}>
                  <Text>
                    {t({
                      en: "Copy mods/sprout from the repository to ~/.claude/mods/sprout:",
                      zh: "把仓库里的 mods/sprout 复制到 ~/.claude/mods/sprout：",
                    })}
                  </Text>
                  <CopyBlock
                    kind="code"
                    text={CLONE_COMMANDS}
                    label={t({ en: "Terminal", zh: "终端" })}
                  />
                </div>
              </li>
              <li>
                <div css={stack.tight}>
                  <Text>
                    {t({
                      en: "Have Claude Code load it, in ~/.claude/settings.json. If CLAUDE_CODE_PLUGIN_DIRS already has a value, add this one after a colon.",
                      zh: "在 ~/.claude/settings.json 里让 Claude Code 加载它。CLAUDE_CODE_PLUGIN_DIRS 已经有值的话，用英文冒号接在后面。",
                    })}
                  </Text>
                  <CopyBlock
                    kind="code"
                    text={SETTINGS_SNIPPET}
                    label="settings.json"
                  />
                </div>
              </li>
              <li>
                <Text>
                  {t({ en: "Restart Claude Code.", zh: "重启 Claude Code。" })}
                </Text>
              </li>
            </ol>
          </Disclosure>
        </div>
        <FlowBlock css={stack.item}>
          <div css={stack.tight}>
            <Heading level={3} look="h2">
              {t({ en: "2. Sync to your phone", zh: "2. 同步到手机" })}
            </Heading>
            <Text>
              {t({
                en: "Open Claude Code. At the bottom of the Miao pane, Miao asks: “See Miao on your phone too?” Choose “Sync to phone”, then sign in on the page that opens (or sign up) and confirm: that links your Mac to your Buddy account. A few minutes later, Miao wakes up on your page.",
                zh: "打开 Claude Code，小苗会问「手机上也想看小苗？」。点「同步到手机」，在打开的网页里登录（没有账号就注册一个）并确认，Mac 就连上了你的搭子账号。几分钟后，小苗就在你的页面上醒来。",
              })}
            </Text>
          </div>
          {syncAction ? <div css={cluster.item}>{syncAction}</div> : null}
        </FlowBlock>
      </div>
    </section>
  );
}

const styles = stylex.create({
  section: {
    scrollMarginBlockStart: space._5,
  },
  intro: {
    maxInlineSize: measure.prose,
  },
  // One column on a phone, two equal ones from `lg`.
  steps: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
    alignItems: "start",
    columnGap: rhythm.section,
    rowGap: rhythm.group,
  },
  list: {
    margin: 0,
    paddingInlineStart: space._5,
  },
});
