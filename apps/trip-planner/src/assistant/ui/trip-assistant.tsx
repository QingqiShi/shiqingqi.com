"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Sheet } from "@tuja/ui/components/sheet";
import { SideColumnLayout } from "@tuja/ui/components/side-column-layout";
import { sideColumnTokens } from "@tuja/ui/components/side-column-layout.stylex";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  controlHeight,
  controlSize,
  layer,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AppToasts } from "#src/shell/app-toasts.tsx";
import {
  AssistantPromptField,
  type TextControl,
} from "./assistant-prompt-field.tsx";
import {
  BackButton,
  ConversationEntries,
  useScreenTitle,
  type AssistantScreen,
} from "./conversation-entries.tsx";
import { Conversation } from "./conversation.tsx";
import { HistoryScreen } from "./history-screen.tsx";
import { MemoryScreen } from "./memory-screen.tsx";
import { ContinueBar, SegmentScreen } from "./segment-screen.tsx";
import {
  useTripAssistant,
  type TripAssistantModel,
} from "./use-trip-assistant.ts";
import { useTripVersionWatch } from "./use-trip-version-watch.ts";

interface AssistantPageProps {
  /** Whether the layout has room for the column beside the trip. */
  isAvailable: boolean | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  closeLabel: string;
  model: TripAssistantModel;
  fieldRef: RefObject<TextControl | null>;
  dockFieldRef: RefObject<TextControl | null>;
  /** The way back from a screen, or `null` on the conversation. */
  back: ReactNode;
  onScreen: (screen: AssistantScreen) => void;
  content: ReactNode;
  prompt: ReactNode;
  children: ReactNode;
}

/**
 * The trip beside the column, with the prompt docked at its bottom, and the
 * conversation in a sheet where the column has no room.
 */
function AssistantPage({
  isAvailable,
  isOpen,
  onOpen,
  onClose,
  title,
  closeLabel,
  model,
  fieldRef,
  dockFieldRef,
  back,
  onScreen,
  content,
  prompt,
  children,
}: AssistantPageProps) {
  const inColumn = isAvailable === true;
  const hasDock = !(isOpen && inColumn);
  const dockRef = useRef<HTMLDivElement>(null);
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

  return (
    <AppToasts
      css={[
        dockHeight > 0 && styles.toasts(dockHeight),
        !hasDock && styles.toastsBesideColumn,
      ]}
    >
      {children}
      {!hasDock ? null : (
        <StickyControls css={styles.dock}>
          <StickyControlGroup css={styles.fill}>
            <div ref={dockRef} css={styles.fill}>
              <AssistantPromptField
                model={model}
                fieldRef={dockFieldRef}
                onFocus={onOpen}
              />
            </div>
          </StickyControlGroup>
        </StickyControls>
      )}
      {inColumn ? null : (
        <Sheet
          isOpen={isOpen}
          onClose={onClose}
          closeLabel={closeLabel}
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
                    onScreen={onScreen}
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

/**
 * The trip assistant on the page where a member reads a trip: a prompt
 * docked at the bottom, which opens the conversation in a column beside the
 * trip where the column has room, and in a sheet where it has not.
 */
export function TripAssistant({
  tripId,
  version,
  children,
}: {
  tripId: string;
  /** `digest(trip)` of the trip on the page. */
  version: string;
  /** The page of the trip, beside the column. */
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
  const fieldRef = useRef<TextControl>(null);
  const dockFieldRef = useRef<TextControl>(null);
  const title = useScreenTitle(screen);
  const closeLabel = t({ en: "Close", zh: "关闭" });
  const isConversation = screen.name === "conversation";
  useTripVersionWatch(tripId, version, isOpen && !model.isStreaming);

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
      <AssistantPromptField model={model} fieldRef={fieldRef} />
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
    <SideColumnLayout
      css={styles.layout}
      isOpen={isOpen}
      onClose={close}
      title={title}
      closeLabel={closeLabel}
      leading={back}
      actions={
        isConversation ? (
          <ConversationEntries
            model={model}
            onScreen={setScreen}
            labelled={false}
          />
        ) : null
      }
      column={content}
      footer={prompt}
      initialFocusRef={fieldRef}
      returnFocusRef={dockFieldRef}
    >
      {({ isAvailable }) => (
        <AssistantPage
          isAvailable={isAvailable}
          isOpen={isOpen}
          onOpen={open}
          onClose={close}
          title={title}
          closeLabel={closeLabel}
          model={model}
          fieldRef={fieldRef}
          dockFieldRef={dockFieldRef}
          back={back}
          onScreen={setScreen}
          content={content}
          prompt={prompt}
        >
          {children}
        </AssistantPage>
      )}
    </SideColumnLayout>
  );
}

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
    inlineSize: "100%",
    marginInline: "auto",
    maxInlineSize: "89vw",
    marginBlockStart: rhythm.group,
  },
  fill: {
    flexGrow: 1,
    minInlineSize: 0,
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
  // Less than the default minimum, so that the column shows on a 1280px
  // window with the sidebar open.
  layout: {
    [sideColumnTokens.mainMinInlineSize]: "34rem",
  },
  toastsBesideColumn: {
    left: `calc((100vw - ${sideColumnTokens.inlineSize}) / 2)`,
  },
  toasts: (dockHeight: number) => ({
    [toastTokens.clearance]: `calc(${DOCK_INSET} + ${String(dockHeight)}px)`,
  }),
});
