import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import {
  ErrorToastSpecimen,
  MessageToastSpecimen,
  ToastDemo,
  UndoToastSpecimen,
  WrappingToastSpecimen,
} from "./toast-specimens.tsx";

const USAGE = `"use client";

import { ToastProvider, useToast } from "@tuja/ui/components/toast-provider";

// Once, around the part of the app that shows toasts.
<ToastProvider dismissLabel="Dismiss" portalTarget={portalTarget}>
  {children}
</ToastProvider>;

// Anywhere below it.
function DeleteButton({ onDelete, onRestore }) {
  const show = useToast();
  const message = "Transaction deleted";
  const undo = "Undo";
  return (
    <Button
      onClick={() => {
        onDelete();
        show({ message, action: { label: undo, onAction: onRestore } });
      }}
    >
      Delete
    </Button>
  );
}`;

const CLEARANCE = `import { toastTokens } from "@tuja/ui/components/toast.stylex";

const styles = stylex.create({
  // Keep the toasts above a tab bar along the bottom.
  aboveTabBar: { [toastTokens.clearance]: tabBarHeight },
});

<ToastProvider css={styles.aboveTabBar} dismissLabel="Dismiss">
  {children}
</ToastProvider>;`;

export function ToastShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Live", zh: "实时演示" })} leadsWithText>
        <div css={stack.item}>
          <ShowcaseHelper>
            {t({
              en: "Delete the row. A toast says what happened and offers Undo, which brings the row back. It stays for 10 seconds, and for as long as the pointer or the focus is on it.",
              zh: "删除这一行。提示会说明发生了什么，并提供撤销，撤销后这一行会回来。它停留 10 秒；指针或焦点在它上面时会一直停留。",
            })}
          </ShowcaseHelper>
          <ToastDemo />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Surface", zh: "表面" })}>
        <SpecimenGrid css={styles.grid}>
          <Specimen caption={t({ en: "with Undo", zh: "带撤销" })}>
            <UndoToastSpecimen />
          </Specimen>
          <Specimen caption={t({ en: "message only", zh: "仅消息" })}>
            <MessageToastSpecimen />
          </Specimen>
          <Specimen caption={t({ en: "two lines", zh: "两行" })}>
            <WrappingToastSpecimen />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Arrival", zh: "出现" })} leadsWithText>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A toast springs up from below and settles, and fades as it goes. Under reduced motion it only fades.",
              zh: "提示从下方弹起并稳定下来，离开时淡出。在减少动态效果的设置下，它只淡入淡出。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Once it has arrived, a Ring light runs once round its edge in the accent colour, drawn on the effect layer. The light marks the arrival and carries no meaning of its own: without WebGPU, with ?effects=off, under forced colours or under reduced motion, the toast is the same toast without it.",
              zh: "提示到位后，环形光会以强调色沿它的边缘跑一圈，绘制在效果层上。这道光只标示出现，本身不承载任何含义：没有 WebGPU、使用 ?effects=off、处于强制颜色模式或减少动态效果时，提示没有它也完全一样。",
            })}
          </Text>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Placement", zh: "位置" })} leadsWithText>
        <div css={stack.item}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Toasts sit centred at the bottom of the screen, a gap above the safe area. Where an app has chrome along the bottom, such as a tab bar, set toastTokens.clearance to the chrome's height, safe area included. The provider adds the gap above it.",
              zh: "提示居中显示在屏幕底部，与安全区域隔开一段间距。如果应用底部有界面元素（例如标签栏），把 toastTokens.clearance 设为它的高度（含安全区域）。提供者会在其上方加上间距。",
            })}
          </Text>
          <UsageSnippet code={CLEARANCE} />
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable component="toast-provider" />
      <PropsTable component="toast" />

      <DoDont
        do={<UndoToastSpecimen />}
        doCaption={t({
          en: "Confirm what an action did, in a few words, and offer the one step that follows from it.",
          zh: "用几个字确认操作的结果，并提供紧随其后的那一步。",
        })}
        dont={<ErrorToastSpecimen />}
        dontCaption={t({
          en: "Don't put a problem the visitor has to fix in a toast: it goes away. Show it with a Callout where the problem is.",
          zh: "不要把访客必须处理的问题放进提示：它会消失。在问题所在的位置用提示框显示它。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  grid: {
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
  },
});
