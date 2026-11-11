"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { animate } from "@tuja/ui/primitives/motion.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { Anchor } from "#src/links/anchor.tsx";
import type { FirstRunStage } from "./first-run-stage.ts";

/**
 * The one job of the page before the first upload: get the owner's Mac connected. Every step
 * happens on the Mac, so the page only says what to do there and waits.
 */
export function FirstRun({ stage }: { stage: FirstRunStage }) {
  const locale = useLocale();
  const isConnected = stage === "waiting-data";
  const doneLabel = t({ en: "Done:", zh: "已完成：" });
  const steps = [
    {
      text: t({
        en: "Install the Miao mod on your Mac.",
        zh: "在 Mac 上装好小苗 mod。",
      }),
      link: {
        href: `${getLocalePath("/", locale)}#install`,
        label: t({ en: "How to install", zh: "怎么装" }),
      },
    },
    {
      text: t({
        en: "Open Claude Code. Miao asks whether to sync.",
        zh: "打开 Claude Code，小苗会问要不要同步。",
      }),
    },
    {
      text: t({
        en: "On the page that opens on the Mac, tap Connect.",
        zh: "在 Mac 上打开的网页里，点「连接」。",
      }),
    },
  ];

  return (
    <div css={stack.group}>
      <Text>
        {t({
          en: "Your Miao from Claude Code moves in to this page, so your phone can look in at any time.",
          zh: "你在 Claude Code 里的小苗，会住到这里，手机上随时能看。",
        })}
      </Text>
      <Card>
        <Heading level={2} look="h3">
          {t({ en: "Connect your Mac", zh: "把 Mac 连上来" })}
        </Heading>
        <ol css={[stack.item, styles.steps]}>
          {steps.map((step, index) => (
            <li key={step.text} css={[row.item, styles.step]}>
              <span
                aria-hidden
                css={[
                  typeRole.caption,
                  styles.badge,
                  isConnected && styles.badgeDone,
                ]}
              >
                {isConnected ? <CheckIcon weight="bold" /> : index + 1}
              </span>
              {isConnected ? <span css={a11y.srOnly}>{doneLabel}</span> : null}
              <Text as="span">
                {step.text}
                {step.link === undefined ? null : (
                  <>
                    {" "}
                    <Anchor href={step.link.href}>{step.link.label}</Anchor>
                  </>
                )}
              </Text>
            </li>
          ))}
        </ol>
      </Card>
      <div role="status" css={[row.tight, styles.wait]}>
        <span
          aria-hidden
          css={[styles.dot, isConnected && styles.dotLive, animate.pulse]}
        />
        <Text as="span" look="bodySmall" tone="muted">
          {isConnected
            ? t({
                en: "Connected. Waiting for the first data (up to 5 minutes).",
                zh: "已经连上，正在等第一份数据（最多 5 分钟）。",
              })
            : t({ en: "Waiting for your Mac…", zh: "正在等你的 Mac…" })}
        </Text>
      </div>
    </div>
  );
}

const styles = stylex.create({
  steps: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  step: {
    alignItems: "flex-start",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    // One body line tall, so that it sits on the first line of the step.
    inlineSize: space._5,
    blockSize: space._5,
    borderRadius: border.radius_round,
    cornerShape: "round",
    fontWeight: font.weight_6,
    color: color.mutedForeground,
    backgroundColor: color.muted,
  },
  badgeDone: {
    color: color.successForeground,
    backgroundColor: color.success,
  },
  wait: {
    justifyContent: "center",
    paddingBlockStart: rhythm.tight,
  },
  dot: {
    inlineSize: space._1,
    blockSize: space._1,
    flexShrink: 0,
    borderRadius: border.radius_round,
    cornerShape: "round",
    backgroundColor: color.mutedForeground,
  },
  dotLive: {
    backgroundColor: color.success,
  },
});
