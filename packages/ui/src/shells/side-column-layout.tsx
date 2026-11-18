"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { Button } from "../actions/button.tsx";
import { color } from "../color.stylex.ts";
import { Heading } from "../content/heading.tsx";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { mergeRefs } from "../merge-refs.ts";
import { bind } from "../motion/bind.ts";
import { cssTween } from "../motion/css-tween.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";
import { Portal } from "../surfaces/portal.tsx";
import { useIsInSheetBoundary } from "../surfaces/sheet.tsx";
import { border, layer, rhythm, safeArea, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { sideColumnTokens } from "./side-column-layout.stylex.ts";
import { useSideColumnFits } from "./use-side-column-fits.ts";
import { useSideColumnRoomWidth } from "./use-side-column-room-width.ts";

const COLUMN_SPRING = springOf(springRoles.columnPush);
const REDUCED_FADE = cssTween(duration._150, easing.ease);

/** What a `SideColumnLayout` tells the content beside its column. */
export interface SideColumnState {
  /**
   * Whether the column has room beside the main content: `null` until the
   * layout has measured itself. Where it is `false`, the layout shows no
   * column, and the app shows its own form, such as a `Sheet`.
   */
  isAvailable: boolean | null;
}

interface SideColumnLayoutProps {
  /**
   * The main content, or a function of the `SideColumnState` that returns
   * it, so that the content can show a `Sheet` in place of the column where
   * the column has no room.
   *
   * @zh 主内容，或一个接收 `SideColumnState` 并返回主内容的函数，以便在侧栏放不下时由内容改用 `Sheet` 显示。
   */
  children: ReactNode | ((state: SideColumnState) => ReactNode);
  /**
   * Whether the column is open. The layout follows it, and the app changes
   * it, through `onClose` among others.
   *
   * @zh 侧栏是否打开。布局跟随该值，由应用修改它，例如在 `onClose` 中。
   */
  isOpen: boolean;
  /**
   * Called when the person closes the column: its close button, or Escape
   * while focus is in the column.
   *
   * @zh 用户关闭侧栏时调用：点按关闭按钮，或焦点在侧栏内时按 Escape。
   */
  onClose: () => void;
  /**
   * The title at the top of the column, which also names its landmark.
   *
   * @zh 侧栏顶部的标题，同时作为其地标区域的名称。
   */
  title: string;
  /**
   * The accessible name of the close button, in the page's language.
   *
   * @zh 关闭按钮的无障碍名称，使用页面的语言。
   */
  closeLabel: string;
  /**
   * What the column shows under its title, in its own scroll, such as a
   * conversation.
   *
   * @zh 侧栏在标题下方显示的内容，单独滚动，例如一段对话。
   */
  column: ReactNode;
  /**
   * Before the title, such as a back button.
   *
   * @zh 标题之前的内容，例如返回按钮。
   */
  leading?: ReactNode;
  /**
   * After the title, before the close button: a few small buttons.
   *
   * @zh 标题之后、关闭按钮之前的内容：几个小按钮。
   */
  actions?: ReactNode;
  /**
   * What stays at the bottom of the column while its content scrolls, such
   * as a `PromptField`.
   *
   * @zh 侧栏内容滚动时固定在底部的内容，例如 `PromptField`。
   */
  footer?: ReactNode;
  /**
   * The element that takes focus when the person opens the column. Without
   * it, the column itself takes focus.
   *
   * @zh 用户打开侧栏时获得焦点的元素。未提供时，焦点落在侧栏本身。
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * The element that takes focus back when the column closes, where no
   * element had focus as it opened. A press on a button does not give it
   * focus in Safari.
   *
   * @zh 侧栏关闭时取回焦点的元素，用于打开时没有元素获得焦点的情况。在 Safari 中，按下按钮不会让按钮获得焦点。
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /**
   * StyleX styles merged over the layout's own, such as the sizes of
   * `sideColumnTokens`.
   *
   * @zh 合并在布局自身样式之上的 StyleX 样式，例如 `sideColumnTokens` 中的尺寸。
   */
  css?: StyleProp;
}

/**
 * Main content and a column at its inline end, such as an assistant beside
 * the page that it talks about. The column pushes the content: the content
 * gets narrower, and keeps the page scroll. The column stays on the screen,
 * at its inline end and as tall as the screen, also where the layout sits in
 * a box with padding, such as the content column of a `NavigationSplitView`.
 * Its title and its `footer` stay in view, and its content scrolls in its
 * own scroll. In a `SheetBoundary`, the layout is as tall as
 * that box, and the main content scrolls in its own box too.
 *
 * The layout measures its own width, not the screen's. The column shows only
 * where the layout has room for the column and `mainMinInlineSize` of
 * content beside it. Where it has not, the layout shows no column, and
 * `children` as a function gets `isAvailable: false`, so that the app can
 * show the same content in a `Sheet`.
 *
 * The app owns `isOpen`. When the person opens the column, it slides in from
 * the inline end, and focus goes into it; when it closes, it slides back out,
 * and focus goes back to the element that opened it. Escape closes it while
 * focus is in it. Under reduced motion, it fades.
 */
export function SideColumnLayout({
  children,
  isOpen,
  onClose,
  title,
  closeLabel,
  column,
  leading,
  actions,
  footer,
  initialFocusRef,
  returnFocusRef,
  css,
}: SideColumnLayoutProps) {
  const isContained = useIsInSheetBoundary();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [probe, setProbe] = useState<HTMLElement | null>(null);
  const isAvailable = useSideColumnFits(root, probe);
  const [isLeaving, setIsLeaving] = useState(false);
  const [enters, setEnters] = useState(false);
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    setIsLeaving(!isOpen && isAvailable === true);
    setEnters(isOpen && isAvailable === true);
  }
  if (isAvailable !== true && (isLeaving || enters)) {
    setIsLeaving(false);
    setEnters(false);
  }
  const showsColumn = isAvailable === true && (isOpen || isLeaving);
  const mainRegion = useScrollRegion();
  const main =
    typeof children === "function" ? children({ isAvailable }) : children;

  return (
    <div ref={setRoot} css={[styles.root, isContained && styles.filled, css]}>
      <span aria-hidden css={styles.probeBox}>
        <span ref={setProbe} css={styles.probe} />
      </span>
      <div
        ref={isContained ? mainRegion.scroller : undefined}
        css={[styles.main, isContained && styles.mainScrolls]}
      >
        <div
          ref={isContained ? mainRegion.content : undefined}
          css={styles.mainContent}
        >
          {isContained ? (
            <EffectCarrier value={mainRegion}>{main}</EffectCarrier>
          ) : (
            main
          )}
        </div>
      </div>
      {showsColumn ? (
        <SideColumn
          isOpen={isOpen}
          isLeaving={isLeaving}
          enters={enters}
          sticks={!isContained}
          onEntered={() => {
            setEnters(false);
          }}
          onLeft={() => {
            setIsLeaving(false);
          }}
          onClose={onClose}
          title={title}
          closeLabel={closeLabel}
          leading={leading}
          actions={actions}
          footer={footer}
          initialFocusRef={initialFocusRef}
          returnFocusRef={returnFocusRef}
        >
          {column}
        </SideColumn>
      ) : null}
    </div>
  );
}

interface SideColumnProps {
  isOpen: boolean;
  /** Whether the column is closed, and shows only while it moves out. */
  isLeaving: boolean;
  /**
   * Whether the person opened the column since it last showed, so that it
   * comes in and takes focus as it mounts.
   */
  enters: boolean;
  /** Whether the page scrolls the main content, and the column stays on the screen. */
  sticks: boolean;
  /** Called when the column that comes in has started its motion. */
  onEntered: () => void;
  /** Called when the column that leaves is out of view. */
  onLeft: () => void;
  onClose: () => void;
  title: string;
  closeLabel: string;
  leading: ReactNode;
  actions: ReactNode;
  footer: ReactNode;
  initialFocusRef: RefObject<HTMLElement | null> | undefined;
  returnFocusRef: RefObject<HTMLElement | null> | undefined;
  children: ReactNode;
}

function SideColumn({
  isOpen,
  isLeaving,
  enters,
  sticks,
  onEntered,
  onLeft,
  onClose,
  title,
  closeLabel,
  leading,
  actions,
  footer,
  initialFocusRef,
  returnFocusRef,
  children,
}: SideColumnProps) {
  const titleId = useId();
  const columnRef = useRef<HTMLElement>(null);
  const [surface, setSurface] = useState<HTMLElement | null>(null);
  const [room, setRoom] = useState<HTMLElement | null>(null);
  const roomWidth = useSideColumnRoomWidth(room);
  const engine = useMotionEngine();
  const shown = useMotionValue(engine, isOpen && !enters ? 1 : 0, {
    spring: COLUMN_SPRING,
  });

  useLayoutEffect(() => {
    if (surface === null) return;
    const sign = getComputedStyle(surface).direction === "rtl" ? -1 : 1;
    const binding = bind(surface, shown, {
      pose: (p) => ({
        transform: `translateX(${(sign * (1 - p) * 100).toFixed(3)}%)`,
      }),
      reducedPose: (p) => ({ opacity: p.toFixed(3) }),
    });
    return () => {
      binding.unbind();
    };
  }, [surface, shown]);

  const wasOpenRef = useRef(isOpen && !enters);
  const openerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    const element = columnRef.current;
    if (element === null || wasOpen === isOpen) return;
    if (isOpen) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && !element.contains(active)) {
        openerRef.current = active === document.body ? null : active;
      }
      (initialFocusRef?.current ?? element).focus({ preventScroll: true });
      onEntered();
      return;
    }
    const active = document.activeElement;
    if (
      active === null ||
      active === document.body ||
      element.contains(active)
    ) {
      const opener = openerRef.current;
      const target = opener?.isConnected
        ? opener
        : (returnFocusRef?.current ?? null);
      target?.focus({ preventScroll: true });
    }
    openerRef.current = null;
  }, [isOpen, initialFocusRef, returnFocusRef, onEntered]);

  // The engine stops each motion when React runs the effects again, as it
  // does in development. Thus this effect starts the motion from the target,
  // and not from a change of `isOpen`.
  useLayoutEffect(() => {
    const target = isOpen ? 1 : 0;
    if (shown.target === target) return;
    void shown
      .to(target, { reduced: REDUCED_FADE })
      .finished.then((isAtRest) => {
        if (isAtRest && target === 0) onLeft();
      });
  }, [isOpen, shown, onLeft]);

  const parts = (
    <>
      <div css={styles.header}>
        {leading}
        <Heading id={titleId} level={2} look="h4" css={styles.title}>
          {title}
        </Heading>
        {actions}
        <Button
          look="ghost"
          size="sm"
          icon={<XIcon weight="bold" />}
          aria-label={closeLabel}
          onClick={onClose}
        />
      </div>
      <ColumnScroller>{children}</ColumnScroller>
      {footer == null ? null : <div css={styles.footer}>{footer}</div>}
    </>
  );

  const surfaceBox = (
    <div ref={setSurface} css={styles.surface}>
      {parts}
    </div>
  );
  const aside = {
    columnRef,
    titleId,
    isLeaving,
    onClose,
  };

  if (!sticks) {
    return (
      <ColumnAside
        {...aside}
        css={[styles.filled, isLeaving && styles.leaving]}
      >
        {surfaceBox}
      </ColumnAside>
    );
  }
  // An ancestor that moves, such as a sidebar that folds, holds its fixed
  // descendants. Thus the fixed column goes to the body, and the room
  // stays in the flow.
  return (
    <>
      {isLeaving ? null : <div ref={setRoom} css={styles.room} />}
      <Portal target={undefined}>
        <CoveringAside
          {...aside}
          css={[styles.fixed, roomWidth !== null && styles.width(roomWidth)]}
        >
          {surfaceBox}
        </CoveringAside>
      </Portal>
    </>
  );
}

interface ColumnAsideProps {
  columnRef: RefObject<HTMLElement | null>;
  titleId: string;
  isLeaving: boolean;
  onClose: () => void;
  css: StyleProp;
  children: ReactNode;
}

function ColumnAside({
  columnRef,
  titleId,
  isLeaving,
  onClose,
  css,
  children,
  ref,
}: ColumnAsideProps & { ref?: Ref<HTMLElement> }) {
  return (
    <aside
      ref={mergeRefs<HTMLElement>(columnRef, ref)}
      aria-labelledby={titleId}
      // Only a script gives focus to the column, as it opens. The column is
      // not a control, so it shows no focus ring.
      tabIndex={-1}
      inert={isLeaving}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        onClose();
      }}
      css={[styles.column, css]}
    >
      {children}
    </aside>
  );
}

/** The column fixed to the screen, over the effects of the page. */
function CoveringAside(props: ColumnAsideProps) {
  const cover = useEffectCover();
  return <ColumnAside {...props} ref={cover} />;
}

/** The scroller of the column, a Scroll region in the carrier of the column. */
function ColumnScroller({ children }: { children: ReactNode }) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div ref={scroller} css={[styles.scroller, a11y.focusRingInset]}>
      <div ref={content} css={styles.content}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    position: "relative",
    display: "flex",
    minInlineSize: 0,
  },
  filled: {
    blockSize: "100%",
  },
  // The probe is as wide as the column and the least main content. Its box
  // clips it, so that it never makes the page wider.
  probeBox: {
    position: "absolute",
    inset: 0,
    overflow: "clip",
    visibility: "hidden",
    pointerEvents: "none",
  },
  probe: {
    display: "block",
    inlineSize: `calc(${sideColumnTokens.inlineSize} + ${sideColumnTokens.mainMinInlineSize})`,
    blockSize: 0,
  },
  main: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: 0,
  },
  mainScrolls: {
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  mainContent: {
    position: "relative",
  },
  column: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    boxSizing: "border-box",
    inlineSize: sideColumnTokens.inlineSize,
    overflow: "clip",
    outlineStyle: "none",
  },
  // Where the page scrolls the main content, the flow keeps only the room of
  // the column, and the column is fixed to the edges of the screen. Thus the
  // column reaches the edges also where the layout sits in a box with
  // padding, such as the content column of a `NavigationSplitView`.
  room: {
    flexShrink: 0,
    inlineSize: sideColumnTokens.inlineSize,
  },
  // Safari on iOS samples the middle of the top and the bottom edge of the
  // screen. The column shows only where the main content beside it is at
  // least as wide, so it never covers those points.
  fixed: {
    position: "fixed",
    insetBlock: 0,
    insetInlineEnd: 0,
    zIndex: layer.header,
  },
  width: (inlineSize: number) => ({
    inlineSize: `${String(inlineSize)}px`,
  }),
  // The column that goes takes no width at once, so the main content takes
  // its room, and the column shows over the end of it while it moves out.
  leaving: {
    marginInlineStart: `calc(-1 * ${sideColumnTokens.inlineSize})`,
    zIndex: layer.raised,
  },
  surface: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: 0,
    borderInlineStartWidth: border.size_1,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.border,
    backgroundColor: color.background,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    paddingBlockStart: `calc(${space._2} + ${safeArea.blockStart})`,
    paddingBlockEnd: space._2,
    paddingInlineStart: space._4,
    paddingInlineEnd: `max(${space._2}, env(safe-area-inset-right))`,
  },
  title: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  scroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: "100%",
    paddingBlock: space._2,
    paddingInlineStart: space._4,
    paddingInlineEnd: `max(${space._4}, env(safe-area-inset-right))`,
  },
  footer: {
    paddingBlockStart: space._2,
    paddingBlockEnd: `max(${space._4}, env(safe-area-inset-bottom))`,
    paddingInlineStart: space._4,
    paddingInlineEnd: `max(${space._4}, env(safe-area-inset-right))`,
  },
});
