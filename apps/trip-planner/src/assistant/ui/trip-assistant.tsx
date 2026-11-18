"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { Heading } from "@tuja/ui/components/heading";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { Sheet } from "@tuja/ui/components/sheet";
import { Spinner } from "@tuja/ui/components/spinner";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { useEffectCover } from "@tuja/ui/hooks/use-effect-cover";
import { useMediaQuery } from "@tuja/ui/hooks/use-media-query";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  border,
  controlHeight,
  controlSize,
  layer,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AppToasts } from "#src/shell/app-toasts.tsx";
import { useOnline } from "#src/trips/save/use-online.ts";
import {
  BackButton,
  ConversationEntries,
  useScreenTitle,
  useSegmentFailureWords,
  type AssistantScreen,
} from "./conversation-entries.tsx";
import { Conversation } from "./conversation.tsx";
import { HistoryScreen } from "./history-screen.tsx";
import { MemoryScreen } from "./memory-screen.tsx";
import { ContinueBar, SegmentScreen } from "./segment-screen.tsx";
import {
  useTripAssistant,
  type DecideFailure,
  type SendFailure,
  type TripAssistantModel,
} from "./use-trip-assistant.ts";
import { useTripVersionWatch } from "./use-trip-version-watch.ts";

type TextControl = HTMLInputElement | HTMLTextAreaElement;

function useNotices() {
  return {
    send: {
      failed: t({
        en: "The assistant could not finish. Your message is back in the field: send it again.",
        zh: "助手没能完成这次回答。你的消息已放回输入框，可以再发一次。",
      }),
      timeout: t({
        en: "The answer took too long and stopped. Your message is back in the field: ask for less at a time.",
        zh: "回答用时太长，已停止。你的消息已放回输入框，试着一次少问一些。",
      }),
      too_long: t({
        en: "That message is too long. Shorten it and send it again.",
        zh: "这条消息太长了，请缩短后再发送。",
      }),
      busy: t({
        en: "The assistant is still answering your last message. Wait for it, then send this.",
        zh: "助手还在回答你上一条消息，请等它答完再发送。",
      }),
      request_failed: t({
        en: "The message did not go through. Check the connection and try again.",
        zh: "消息没有发送成功，请检查网络后再试。",
      }),
    } satisfies Record<SendFailure, string>,
    decide: {
      conflict: t({
        en: "The trip changed in the same place, so this could not be done.",
        zh: "行程的同一处已经改过，所以没能完成。",
      }),
      busy: t({
        en: "Wait until the assistant has answered, then try again.",
        zh: "请等助手答完后再试。",
      }),
      request_failed: t({
        en: "That did not go through. Try again.",
        zh: "操作没有成功，请再试一次。",
      }),
    } satisfies Record<DecideFailure, string>,
  };
}

function AssistantPrompt({
  model,
  fieldRef,
  onFocus,
}: {
  model: TripAssistantModel;
  fieldRef?: RefObject<TextControl | null>;
  /** Called when the field takes focus, so that the conversation opens. */
  onFocus?: () => void;
}) {
  const isOnline = useOnline();
  const notices = useNotices();
  const segmentFailureWords = useSegmentFailureWords();
  const label = t({
    en: "Ask about the trip or change it",
    zh: "问问这趟行程，或者让助手修改",
  });
  const canSend = isOnline && !model.isRunning && model.switching === null;
  const hasWords = model.draft.trim().length > 0;

  const status = (words: ReactNode) => (
    <div css={[row.tight, styles.status]}>{words}</div>
  );
  const header = !isOnline
    ? status(
        <Text look="bodySmall" tone="muted">
          {t({
            en: "You are offline. The assistant comes back with the connection.",
            zh: "你现在处于离线状态，恢复连接后才能使用助手。",
          })}
        </Text>,
      )
    : model.isRunning || model.switching === "new"
      ? status(
          <span role="status" css={row.tight}>
            <Spinner size="sm" aria-hidden />
            <Text as="span" look="bodySmall" tone="muted">
              {model.isRunning
                ? t({ en: "Answering…", zh: "正在回答…" })
                : t({
                    en: "Writing a summary and starting a new conversation…",
                    zh: "正在写小结，并开始新对话…",
                  })}
            </Text>
          </span>,
        )
      : model.segmentFailure
        ? status(
            <div role="alert">
              <Text as="p" look="bodySmall" tone="destructive">
                {segmentFailureWords[model.segmentFailure]}
              </Text>
            </div>,
          )
        : model.sendFailure
          ? status(
              <div role="alert">
                <Text look="bodySmall" tone="destructive">
                  {notices.send[model.sendFailure]}
                </Text>
              </div>,
            )
          : model.decideFailure
            ? status(
                <div role="alert">
                  <Text look="bodySmall" tone="destructive">
                    {notices.decide[model.decideFailure]}
                  </Text>
                </div>,
              )
            : undefined;

  return (
    <div
      css={styles.fill}
      onFocus={(event) => {
        // A sheet that closes gives the focus back to this field. That
        // focus comes from the sheet, or from nothing, and must not open it
        // again. A tap opens it through the click.
        const from = event.relatedTarget;
        if (from instanceof Element && !from.closest('[role="dialog"]')) {
          onFocus?.();
        }
      }}
      onClick={onFocus}
    >
      <PromptField
        ref={fieldRef}
        label={label}
        placeholder={label}
        value={model.draft}
        onValueChange={model.setDraft}
        onSubmit={() => {
          if (canSend) void model.send(model.draft);
        }}
        multiline
        disabled={!isOnline}
        header={header}
        action={
          <Button
            type="submit"
            size="sm"
            look={hasWords && canSend ? "primary" : undefined}
            aria-label={t({ en: "Send", zh: "发送" })}
            disabled={!hasWords || !canSend}
            icon={<ArrowUpIcon weight="bold" role="presentation" />}
          />
        }
      />
    </div>
  );
}

interface PanelProps {
  title: string;
  /** Before the title, such as the way back. */
  leading: ReactNode;
  /** After the title, such as what the person can do with the conversation. */
  entries: ReactNode;
  onClose: () => void;
  fieldRef: RefObject<TextControl | null>;
  children: ReactNode;
  prompt: ReactNode;
}

/** From 64rem up: the conversation in a panel at the right edge, beside the page. */
function AssistantPanel(props: PanelProps) {
  return createPortal(
    <EffectCarrier value="viewport">
      <PanelSurface {...props} />
    </EffectCarrier>,
    document.body,
  );
}

function PanelSurface({
  title,
  leading,
  entries,
  onClose,
  fieldRef,
  children,
  prompt,
}: PanelProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  const cover = useEffectCover();

  useEffect(() => {
    fieldRef.current?.focus();
  }, [fieldRef]);

  return (
    <section
      ref={cover}
      aria-label={title}
      css={styles.panel}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div css={[row.tight, styles.panelHead]}>
        {leading}
        <Heading level={2} look="h4" css={styles.panelTitle}>
          {title}
        </Heading>
        {entries}
        <Button
          size="sm"
          look="ghost"
          aria-label={t({ en: "Close", zh: "关闭" })}
          icon={<XIcon weight="bold" />}
          onClick={onClose}
        />
      </div>
      <div ref={scroller} css={styles.panelScroller}>
        <div ref={content} css={styles.panelContent}>
          <EffectCarrier value={region}>{children}</EffectCarrier>
        </div>
      </div>
      {prompt === null ? null : <div css={styles.panelPrompt}>{prompt}</div>}
    </section>
  );
}

/**
 * The trip assistant on the page where a member reads a trip: a prompt
 * docked at the bottom, which opens the conversation in a sheet on a phone
 * and on a tablet, and in a panel at the right edge from 64rem up.
 */
export function TripAssistant({
  tripId,
  version,
  children,
}: {
  tripId: string;
  /** `digest(trip)` of the trip on the page. */
  version: string;
  /** The page of the trip, which makes room for the panel beside it. */
  children: ReactNode;
}) {
  const model = useTripAssistant(tripId, version);
  const [isOpen, setIsOpen] = useState(false);
  const [openScreen, setOpenScreen] = useState<AssistantScreen>({
    name: "conversation",
  });
  const screen = openScreen;
  const setScreen = (next: AssistantScreen) => {
    model.dismissSegmentFailure();
    setOpenScreen(next);
  };
  // Below 64rem, the sidebar and the panel together leave the trip too
  // narrow to read, so the conversation opens in the sheet there.
  const isWide = useMediaQuery("(min-width: 64rem)", false);
  const dockRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<TextControl>(null);
  const title = useScreenTitle(screen);
  const isConversation = screen.name === "conversation";
  useTripVersionWatch(tripId, version, isOpen && !model.isStreaming);

  const hasDock = !(isOpen && isWide);
  const [dockHeight, setDockHeight] = useState(0);
  useEffect(() => {
    const dock = dockRef.current;
    if (!hasDock || !dock) return;
    const observer = new ResizeObserver(() => {
      setDockHeight(dock.offsetHeight);
    });
    observer.observe(dock);
    return () => {
      observer.disconnect();
      setDockHeight(0);
    };
  }, [hasDock]);

  const focusOnReturnRef = useRef(false);
  useEffect(() => {
    if (!isConversation || !focusOnReturnRef.current) return;
    focusOnReturnRef.current = false;
    fieldRef.current?.focus();
  }, [isConversation]);

  const open = () => {
    if (isOpen) return;
    setIsOpen(true);
    void model.load();
  };
  const close = () => {
    setIsOpen(false);
    setScreen({ name: "conversation" });
  };
  const openMemory = () => {
    setScreen({ name: "memory" });
  };

  const body =
    screen.name === "history" ? (
      <HistoryScreen tripId={tripId} onScreen={setScreen} />
    ) : screen.name === "segment" ? (
      <SegmentScreen key={screen.id} id={screen.id} />
    ) : screen.name === "memory" ? (
      <MemoryScreen tripId={tripId} />
    ) : (
      <Conversation model={model} onOpenMemory={openMemory} />
    );
  const content = <div css={[stack.item, styles.conversation]}>{body}</div>;
  const prompt =
    screen.name === "conversation" ? (
      <AssistantPrompt model={model} fieldRef={fieldRef} />
    ) : screen.name === "segment" ? (
      <ContinueBar
        id={screen.id}
        model={model}
        onContinued={() => {
          focusOnReturnRef.current = true;
          setScreen({ name: "conversation" });
        }}
      />
    ) : null;
  const back = isConversation ? null : (
    <BackButton screen={screen} onScreen={setScreen} />
  );

  return (
    <AppToasts
      css={[
        dockHeight > 0 && styles.toasts(dockHeight),
        !hasDock && styles.toastsBesidePanel,
      ]}
    >
      <div css={isOpen && isWide && styles.besidePanel}>{children}</div>
      {!hasDock ? null : (
        <StickyControls css={styles.dock}>
          <StickyControlGroup css={styles.fill}>
            <div ref={dockRef} css={styles.fill}>
              <AssistantPrompt model={model} onFocus={open} />
            </div>
          </StickyControlGroup>
        </StickyControls>
      )}
      {isWide ? (
        isOpen ? (
          <AssistantPanel
            title={title}
            leading={back}
            entries={
              isConversation ? (
                <ConversationEntries
                  model={model}
                  onScreen={setScreen}
                  labelled={false}
                />
              ) : null
            }
            onClose={close}
            fieldRef={fieldRef}
            prompt={prompt}
          >
            {content}
          </AssistantPanel>
        ) : null
      ) : (
        <Sheet
          isOpen={isOpen}
          onClose={close}
          closeLabel={t({ en: "Close", zh: "关闭" })}
          title={title}
          initialFocusRef={fieldRef}
          liftFrom={() => dockRef.current}
        >
          <div css={[stack.item, styles.sheetBody]}>
            <div css={styles.sheetEntriesRow}>
              <div css={[row.tight, styles.sheetEntries]}>
                {back ?? (
                  <ConversationEntries
                    model={model}
                    onScreen={setScreen}
                    labelled
                  />
                )}
              </div>
            </div>
            {content}
            {prompt === null ? null : (
              <div css={styles.sheetPromptRow}>
                <div css={styles.sheetPrompt}>{prompt}</div>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </AppToasts>
  );
}

const PANEL_WIDTH = "min(26rem, 45vw)";

// The place of the accessory of a column of a `NavigationSplitView`: above
// the tab bar below 34rem, and above the safe area from 34rem up.
const DOCK_INSET = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  // Safari on iOS takes the colour of its toolbar from a sticky box at the
  // bottom edge of the screen that is as wide as the screen. The dock stops
  // clear of that edge, and it is narrower than nine tenths of the screen.
  dock: {
    insetBlockStart: "auto",
    insetBlockEnd: DOCK_INSET,
    alignSelf: "center",
    inlineSize: "100%",
    maxInlineSize: "89vw",
    marginBlockStart: rhythm.group,
  },
  fill: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  status: {
    justifyContent: "space-between",
    minBlockSize: controlHeight.sm,
  },
  conversation: {
    flexGrow: 1,
  },
  sheetBody: {
    minBlockSize: "calc(100dvh - 10rem)",
  },
  // The entries stay under the sheet's title row while a long conversation
  // scrolls. The sheet's title row ends at the height of its close button
  // and a tight gap. For Safari on iOS, the sticky box is half as wide as
  // the content, as the prompt row below does it.
  sheetEntriesRow: {
    position: "sticky",
    insetBlockStart: `calc(${controlSize._9} + ${rhythm.tight})`,
    zIndex: `calc(${layer.raised} - 1)`,
    inlineSize: "50%",
  },
  sheetEntries: {
    boxSizing: "border-box",
    inlineSize: `calc(200% + 2 * ${space._3})`,
    minBlockSize: controlHeight.sm,
    marginInlineStart: `calc(-1 * ${space._3})`,
    paddingInline: space._3,
    paddingBlockEnd: rhythm.tight,
    backgroundColor: color.card,
  },
  // The page gives the panel its room, so that the buttons in the page's
  // header stay in view and can be pressed.
  besidePanel: {
    paddingInlineEnd: `calc(${PANEL_WIDTH} + ${space._3})`,
  },
  // Safari on iOS takes the colour of its toolbar from a sticky box that is
  // almost as wide as the screen, and the card moves this box past the
  // bottom edge of the screen. So the sticky box is half as wide as the
  // content, and the prompt in it is twice as wide as the box, as the title
  // row of the sheet does it. It goes down into the padding of the card.
  sheetPromptRow: {
    position: "sticky",
    insetBlockEnd: `calc(-1 * ${space._7})`,
    zIndex: layer.raised,
    inlineSize: "50%",
    marginBlockEnd: `calc(-1 * ${space._7})`,
  },
  sheetPrompt: {
    boxSizing: "border-box",
    inlineSize: `calc(200% + 2 * ${space._3})`,
    marginInlineStart: `calc(-1 * ${space._3})`,
    paddingInline: space._3,
    paddingBlockStart: rhythm.tight,
    paddingBlockEnd: space._3,
    backgroundColor: color.card,
  },
  // Safari on iOS samples the middle of the top and the bottom edge of the
  // screen. The panel stays in the right half of the screen, so it never
  // covers those points.
  panel: {
    position: "fixed",
    insetBlock: space._3,
    insetInlineEnd: space._3,
    zIndex: layer.overlay,
    display: "flex",
    flexDirection: "column",
    inlineSize: PANEL_WIDTH,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_3,
    cornerShape: "squircle",
    backgroundColor: color.card,
    boxShadow: shadow._4,
    overflow: "hidden",
  },
  panelHead: {
    paddingBlock: space._2,
    paddingInlineStart: space._4,
    paddingInlineEnd: space._2,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  panelTitle: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  panelScroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  panelContent: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    minBlockSize: "100%",
    padding: space._4,
  },
  panelPrompt: {
    padding: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  toastsBesidePanel: {
    left: `calc((100vw - ${PANEL_WIDTH} - ${space._3}) / 2)`,
  },
  toasts: (dockHeight: number) => ({
    [toastTokens.clearance]: `calc(${DOCK_INSET} + ${String(dockHeight)}px)`,
  }),
});
