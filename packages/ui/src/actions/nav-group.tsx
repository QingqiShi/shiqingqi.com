"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import {
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { cssTween } from "../motion/css-tween.ts";
import { unit } from "../motion/mix.ts";
import { px } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { duration, easing, transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { selected } from "../primitives/selected.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { border, color, controlSize, font, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { NAV_ROW } from "./create-nav-list-motion.ts";
import { NavListContext, navListStyles } from "./nav-list-context.tsx";
import { navListTokens } from "./nav-list.stylex.ts";

interface NavGroupProps {
  /**
   * The group's name. It names the group for a screen reader too. A group in
   * a `NavList` shows it as a quiet section label above its rows. A group in
   * another group shows it as a row that opens and closes the group. Without
   * a label, the group only sets its rows apart from the next group.
   *
   * @zh 分组的名称，同时为读屏软件命名该分组。直接位于 `NavList` 中的分组将其显示为行上方的低调分区标签；位于另一分组中的分组将其显示为一行，用于展开和收起该分组。没有名称时，分组只把其各行与下一组分开。
   */
  label?: ReactNode;
  /**
   * An icon at the start of the row of a group in a group, in the muted
   * colour. A group in a `NavList` does not show it.
   *
   * @zh 位于另一分组中的分组，其行首的图标，以弱化颜色显示。直接位于 `NavList` 中的分组不显示它。
   */
  icon?: ReactNode;
  /**
   * Marks the group in a group that holds the page being read. Such a group
   * is open on the first render, and it opens when it becomes current. Other
   * groups start closed.
   *
   * @zh 标记包含当前页面的嵌套分组。这样的分组在首次渲染时即为展开状态，并在变为当前分组时展开。其他分组初始为收起状态。
   */
  current?: boolean;
  /**
   * The rows: each a `NavLink`, or a `NavGroup` one level down.
   *
   * @zh 各行：每行是一个 `NavLink`，或下一级的 `NavGroup`。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the group's own.
   *
   * @zh 合并到分组自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * Rows in a `NavList` that belong together. A group nests one level.
 *
 * A group in the list is a section. Its label is a quiet caption on the text
 * edge, directly on its first row. A group in a group is a row the size of a
 * link, with a chevron at its end. The row opens and closes the group: its
 * rows grow open from the row on a spring, the rows below move with them,
 * and the chevron turns on the same spring. While the group is closed, the
 * list's marker is on its row when it holds the current page. The rows of an
 * open group are indented under a guide line. The line is below
 * the centre of the icon, or below the start of the text when there is no
 * icon.
 *
 * The structure sets every space in a `NavList`. Rows touch, because each
 * row pads its own fill. Sections, and a link after a section, are
 * `rhythm.item` apart.
 */
export function NavGroup({
  label,
  icon,
  current = false,
  children,
  css,
}: NavGroupProps) {
  const parent = use(NavListContext);
  const labelId = useId();
  const context = { ...parent, nested: true };

  if (label == null) {
    return (
      <li css={[navListStyles.row, css]}>
        <NavListContext value={context}>
          <ul css={[stack.rows, styles.list]}>{children}</ul>
        </NavListContext>
      </li>
    );
  }

  if (!parent.nested) {
    return (
      <li css={[navListStyles.row, css]}>
        <div role="group" aria-labelledby={labelId}>
          <span
            id={labelId}
            css={[typeRole.caption, navListStyles.rowInset, styles.section]}
          >
            {label}
          </span>
          <NavListContext value={context}>
            <ul css={[stack.rows, styles.list]}>{children}</ul>
          </NavListContext>
        </div>
      </li>
    );
  }

  return (
    <OpeningGroup label={label} icon={icon} current={current} css={css}>
      {children}
    </OpeningGroup>
  );
}

const OPEN_SPRING = springOf(springRoles.move);
const REDUCED_FADE = cssTween(duration._150, easing.ease);

/**
 * A group in a group. Its rows grow open from its row on the spring, and the
 * rows below move down with the layout. The chevron turns on the same
 * spring. A press while the rows move turns them from where they are. Under
 * reduced motion, the rows fade in and out in place.
 */
function OpeningGroup({
  label,
  icon,
  current,
  children,
  css,
}: Omit<NavGroupProps, "current"> & { current: boolean }) {
  const parent = use(NavListContext);
  const labelId = useId();
  const rowsId = useId();
  const [isOpen, setIsOpen] = useState(current);
  const [wasCurrent, setWasCurrent] = useState(current);
  if (current !== wasCurrent) {
    setWasCurrent(current);
    if (current) setIsOpen(true);
  }
  // The rows stay in the layout while they close, and leave it at rest.
  const [isShown, setIsShown] = useState(isOpen);
  if (isOpen && !isShown) setIsShown(true);

  const engine = useMotionEngine();
  const progress = useMotionValue(engine, isOpen ? 1 : 0, {
    spring: OPEN_SPRING,
  });
  const rowsRef = useRef<HTMLUListElement>(null);
  const chevronRef = useRef<HTMLSpanElement>(null);
  const heightRef = useRef(0);
  useBinding(rowsRef, progress, {
    pose: (at) => ({
      height: px(Math.max(0, at) * heightRef.current),
      overflow: "clip",
      opacity: unit(at * 2).toFixed(3),
    }),
    reducedPose: (at) => ({ opacity: unit(at).toFixed(3) }),
    rest: "clear",
  });
  useBinding(chevronRef, progress, {
    pose: (at) => ({ rotate: `${(at * 90).toFixed(2)}deg` }),
    reducedPose: () => ({}),
    rest: "clear",
  });

  const { motion } = parent;
  const wasOpenRef = useRef(isOpen);
  useLayoutEffect(() => {
    if (wasOpenRef.current === isOpen) return;
    wasOpenRef.current = isOpen;
    const rows = rowsRef.current;
    if (rows === null) return;
    heightRef.current = engine.measure(() => rows.scrollHeight);
    motion?.refresh();
    void progress
      .to(isOpen ? 1 : 0, { reduced: REDUCED_FADE })
      .finished.then((landed) => {
        if (landed && !isOpen) setIsShown(false);
      });
  }, [engine, isOpen, motion, progress]);

  return (
    <li css={[navListStyles.row, css]}>
      <button
        type="button"
        id={labelId}
        aria-expanded={isOpen}
        aria-controls={rowsId}
        {...{ [NAV_ROW]: "" }}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        css={[
          typeRole.label,
          buttonReset.base,
          a11y.touchRow,
          transition.colors,
          corner.radius_2,
          navListStyles.rowInset,
          navListStyles.rowControl,
          styles.toggle,
          selected.quiet,
          a11y.focusRingInset,
        ]}
      >
        {icon === undefined ? null : (
          <span css={navListStyles.icon}>{icon}</span>
        )}
        <span css={styles.toggleLabel}>{label}</span>
        <span
          ref={chevronRef}
          css={[
            navListStyles.icon,
            styles.chevron,
            isOpen && styles.chevronOpen,
          ]}
        >
          <CaretRightIcon weight="bold" />
        </span>
      </button>
      <NavListContext value={{ ...parent, nested: true }}>
        <ul
          ref={rowsRef}
          id={rowsId}
          aria-labelledby={labelId}
          hidden={!isShown}
          css={[
            stack.rows,
            styles.list,
            styles.nested,
            !isOpen && styles.closed,
            icon === undefined ? styles.underText : styles.underIcon,
          ]}
        >
          {children}
        </ul>
      </NavListContext>
    </li>
  );
}

const styles = stylex.create({
  list: {
    [navListTokens.step]: 0,
  },
  // Under a coarse pointer a row is taller than its text, so the label
  // takes no space below it there.
  section: {
    display: "block",
    paddingBlockEnd: { default: rhythm.inline, [pointer.coarse]: 0 },
    fontWeight: font.weight_5,
    color: color.fgMuted,
  },
  toggle: {
    inlineSize: "100%",
  },
  toggleLabel: {
    flexGrow: 1,
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chevron: {
    fontSize: controlSize._3,
  },
  chevronOpen: {
    rotate: "90deg",
  },
  // The open motion writes the height while it moves.
  closed: {
    blockSize: 0,
    overflow: "clip",
  },
  // With an icon, the rows of the group start after the icon, so their text
  // starts where the text of the group's row starts, and the guide line is
  // below the centre of the icon. Without one, the line is below the start
  // of the text.
  nested: {
    display: {
      default: "flex",
      ":is([hidden])": "none",
    },
    position: "relative",
    "::before": {
      content: '""',
      position: "absolute",
      insetBlock: 0,
      inlineSize: border.size_1,
      backgroundColor: color.border,
    },
  },
  underIcon: {
    paddingInlineStart: `calc(${controlSize._4} + ${rhythm.tight})`,
    "::before": {
      insetInlineStart: `calc(${navListTokens.rowInset} + (${controlSize._4} - ${border.size_1}) / 2)`,
    },
  },
  underText: {
    paddingInlineStart: `calc(${navListTokens.rowInset} + ${rhythm.tight})`,
    "::before": {
      insetInlineStart: navListTokens.rowInset,
    },
  },
});
