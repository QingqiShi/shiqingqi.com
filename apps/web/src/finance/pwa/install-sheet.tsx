"use client";

import { ExportIcon } from "@phosphor-icons/react/dist/ssr/Export";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { PlusSquareIcon } from "@phosphor-icons/react/dist/ssr/PlusSquare";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlSize,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { t } from "#src/i18n.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { deferredInstallPrompt } from "./deferred-install-prompt.ts";
import { readInstallPlatform } from "./detect-install-platform.ts";
import { FinanceLogo } from "./finance-logo.tsx";

const OFFERED_KEY = "finance:install-offered";
/** Lets the first screen land before the sheet rises over it. */
const SETTLE_MS = 1200;

type Offer = "steps" | "prompt";

function wasOffered() {
  try {
    return window.localStorage.getItem(OFFERED_KEY) !== null;
  } catch {
    return true;
  }
}

function markOffered() {
  try {
    window.localStorage.setItem(OFFERED_KEY, "1");
  } catch {
    // The sheet can then show again on the next visit.
  }
}

/**
 * Offers a visitor who opens Finance in a browser for the first time to add it
 * to the home screen, once per device. Where the browser can install it, the
 * sheet opens the browser's install dialog. On iOS and iPadOS, which cannot,
 * it shows the steps in the Share menu.
 */
export function InstallSheet() {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const { readOnly } = useFinanceRuntime();
  const prompt = useSyncExternalStore(
    deferredInstallPrompt.subscribe,
    deferredInstallPrompt.get,
    deferredInstallPrompt.getServer,
  );
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // The app on the Home Screen asks for a passkey. The demo has no passkey.
    if (!bootstrapped || readOnly || offer !== null) return;
    // A browser that is not on iOS and has the app already does not fire
    // `beforeinstallprompt`.
    const next: Offer | null = prompt
      ? "prompt"
      : readInstallPlatform() === "ios"
        ? "steps"
        : null;
    if (next === null || wasOffered()) return;
    const timer = setTimeout(() => {
      markOffered();
      setOffer(next);
      setIsOpen(true);
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [bootstrapped, readOnly, prompt, offer]);

  const titleId = useId();
  // The sheet opens without a request from the visitor. Thus focus goes to
  // the title, and not to the close button. A screen reader then reads the
  // title first.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const close = () => {
    setIsOpen(false);
  };
  const isPrompt = offer === "prompt";

  return (
    <Sheet
      isOpen={isOpen}
      onClose={close}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      aria-labelledby={titleId}
      initialFocusRef={titleRef}
    >
      <div css={[stack.group, styles.body]}>
        <div css={[stack.item, styles.header]}>
          <div css={styles.appIcon}>
            <FinanceLogo css={styles.fill} />
          </div>
          <div css={stack.text}>
            <h2
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              css={[typeRole.h3, styles.title]}
            >
              {offer === "steps"
                ? t({
                    en: "Add Finance to your Home Screen",
                    zh: "把家庭账本添加到主屏幕",
                  })
                : t({ en: "Install Finance", zh: "安装家庭账本" })}
            </h2>
            <Text tone="muted" align="center">
              {t({
                en: "It opens like an app, with no browser around it, and keeps working offline.",
                zh: "它像 App 一样打开，没有浏览器的边框，离线时也能用。",
              })}
            </Text>
          </div>
        </div>

        {offer === "steps" ? (
          <div css={stack.item}>
            <ol css={[cardSurface.base, listSurface.list, styles.steps]}>
              <Step
                glyph={<ExportIcon weight="bold" />}
                isFirst
                action={t(
                  {
                    en: "Tap <strong>Share</strong>",
                    zh: "点<strong>共享</strong>",
                  },
                  { parse: true },
                )}
                hint={t({
                  en: "Not in the toolbar? Tap ⋯ first.",
                  zh: "工具栏里没有？先点 ⋯。",
                })}
              />
              <Step
                glyph={<PlusSquareIcon weight="bold" />}
                action={t(
                  {
                    en: "Choose <strong>Add to Home Screen</strong>",
                    zh: "选择<strong>添加到主屏幕</strong>",
                  },
                  { parse: true },
                )}
                hint={t({
                  en: "Scroll down the list to find it.",
                  zh: "在列表中向下滑动就能找到。",
                })}
              />
              <Step
                glyph={<FinanceLogo css={styles.fill} />}
                isArt
                action={t(
                  {
                    en: "Tap <strong>Add</strong>",
                    zh: "点<strong>添加</strong>",
                  },
                  { parse: true },
                )}
                hint={t({
                  en: "Finance then opens from its own icon.",
                  zh: "之后从主屏幕上的图标打开家庭账本。",
                })}
              />
            </ol>
            <Text look="bodySmall" tone="muted" align="center">
              <span css={styles.inlineGlyph}>
                <KeyIcon weight="bold" aria-hidden />
              </span>{" "}
              {t({
                en: "The app keeps its own sign-in, so sign in there once more with your passkey.",
                zh: "App 有自己的登录状态，需要在里面用通行密钥再登录一次。",
              })}
            </Text>
          </div>
        ) : null}

        <div css={stack.tight}>
          <Button
            look="primary"
            size="lg"
            css={styles.action}
            onClick={() => {
              close();
              if (isPrompt) deferredInstallPrompt.show();
            }}
          >
            {isPrompt
              ? t({ en: "Install", zh: "安装" })
              : t({ en: "Got it", zh: "知道了" })}
          </Button>
          {isPrompt ? (
            <Button look="ghost" size="lg" css={styles.action} onClick={close}>
              {t({ en: "Not now", zh: "以后再说" })}
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

interface StepProps {
  glyph: ReactNode;
  /** The glyph is a picture that fills its tile, not an icon on the tile. */
  isArt?: boolean;
  isFirst?: boolean;
  action: ReactNode;
  hint: ReactNode;
}

function Step({
  glyph,
  isArt = false,
  isFirst = false,
  action,
  hint,
}: StepProps) {
  return (
    <li css={styles.step}>
      <span
        css={[corner.radius_2, styles.glyph, !isArt && styles.glyphTile]}
        aria-hidden="true"
      >
        {glyph}
      </span>
      <div css={[styles.stepText, !isFirst && styles.separated]}>
        <Text as="div">{action}</Text>
        <Text as="div" look="bodySmall" tone="muted">
          {hint}
        </Text>
      </div>
    </li>
  );
}

const GLYPH_SIZE = space._7;
const STEP_INSET = space._3;

const styles = stylex.create({
  body: {
    paddingBlockStart: space._1,
  },
  header: {
    alignItems: "center",
  },
  // The title is not a control and Tab does not go to it. Focus goes to it
  // only when the sheet opens, so a ring there does not help the visitor.
  title: {
    margin: 0,
    textAlign: "center",
    outline: "none",
  },
  // The radius is the radius of the tile in the mark, so the shadow follows
  // the tile.
  appIcon: {
    inlineSize: space._9,
    blockSize: space._9,
    borderRadius: "22.5%",
    cornerShape: "round",
    boxShadow: shadow._3,
  },
  fill: {
    display: "block",
    inlineSize: "100%",
    blockSize: "100%",
  },
  steps: {
    backgroundColor: color.bgSurfaceSunken,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    paddingInlineStart: STEP_INSET,
  },
  glyph: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: GLYPH_SIZE,
    blockSize: GLYPH_SIZE,
    overflow: "hidden",
  },
  glyphTile: {
    fontSize: controlSize._5,
    color: color.fg,
    backgroundColor: color.bgSurface,
    boxShadow: shadow._1,
  },
  stepText: {
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._2,
    paddingInlineEnd: STEP_INSET,
  },
  // The separator starts at the text, as in an inset grouped list.
  separated: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  inlineGlyph: {
    verticalAlign: "-0.125em",
  },
  action: {
    inlineSize: "100%",
  },
});
