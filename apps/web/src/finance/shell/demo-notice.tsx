"use client";

import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Chip } from "@tuja/ui/components/chip";
import { Popover } from "@tuja/ui/components/popover";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, layer } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import {
  floatingAction,
  floatingActionTokens,
} from "./floating-action.stylex.ts";
import { useSignOut } from "./use-sign-out.ts";

/**
 * Says on every screen of the demo that its changes are not saved, at the
 * bottom start, level with the Add action. It opens what the demo is and a
 * way to leave it. Renders nothing outside the demo.
 */
export function DemoNotice() {
  const { readOnly } = useFinanceRuntime();
  const { busy, signOut } = useSignOut();
  const label = t({ en: "Demo · not saved", zh: "演示 · 不保存" });

  if (!readOnly) return null;

  return (
    <div css={styles.anchor}>
      <Popover
        placement="top-start"
        aria-label={t({ en: "Demo", zh: "演示" })}
        css={styles.popover}
        trigger={(props) => (
          <Chip
            {...props}
            icon={<EyeIcon weight="bold" />}
            css={floatingAction.lift}
          >
            {label}
          </Chip>
        )}
      >
        <div css={stack.item}>
          <Text look="bodySmall">
            {t({
              en: "This household is made up. Your changes stay in this tab until you reload or leave, and nothing is sent.",
              zh: "这个家庭是虚构的。你的更改只保留在此标签页中，刷新或离开后即消失，不会发送到服务器。",
            })}
          </Text>
          <Button
            size="sm"
            look="outline"
            icon={<SignOutIcon weight="bold" />}
            loading={busy}
            onClick={signOut}
          >
            {t({ en: "Leave the demo", zh: "离开演示" })}
          </Button>
        </div>
      </Popover>
    </div>
  );
}

const styles = stylex.create({
  anchor: {
    position: "fixed",
    zIndex: layer.header,
    insetInlineStart: {
      default: pageGutter.inlineStart,
      [breakpoints.md]: `calc(${tabViewTokens.railInlineSize} + ${pageGutter.inlineStart})`,
    },
    insetBlockEnd: `calc(${floatingActionTokens.insetBlockEnd} + (${floatingActionTokens.blockSize} - ${controlHeight.sm}) / 2)`,
  },
  popover: {
    inlineSize: "18rem",
  },
});
