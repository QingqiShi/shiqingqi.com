import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import type {
  AriaAttributes,
  ComponentProps,
  ComponentType,
  ReactNode,
  Ref,
} from "react";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { selected, selectedTokens } from "../primitives/selected.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { color, font, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { listSurface } from "./list.stylex.ts";

/**
 * The contract of the link Slot: `href`, `children`, `className`, `style`,
 * `ref` and the ARIA attributes have to reach the rendered anchor.
 */
export interface ListRowLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** @internal */
function PlainAnchor(props: ListRowLinkProps) {
  return <a {...props} />;
}

interface ListRowBaseProps {
  /**
   * The row's name, on one line.
   *
   * @zh 行的名称，单行显示。
   */
  children: ReactNode;
  /**
   * A muted line under the name, such as a summary or a count.
   *
   * @zh 名称下方的弱化文字，例如摘要或数量。
   */
  detail?: ReactNode;
  /**
   * Shown before the name, such as an Avatar.
   *
   * @zh 显示在名称之前，例如 Avatar。
   */
  leading?: ReactNode;
  /**
   * Shown at the end, before the caret, such as a Badge or an amount.
   *
   * @zh 显示在末尾、箭头之前，例如 Badge 或金额。
   */
  trailing?: ReactNode;
  /**
   * Buttons after the row, outside the part that opens it, such as "Move up".
   * A row with actions shows no caret.
   *
   * @zh 行之后的按钮，位于打开该行的区域之外，例如「上移」。有操作按钮的行不显示箭头。
   */
  actions?: ReactNode;
  /**
   * Shows the caret that says the row opens something. Defaults to `true`.
   * Turn it off where the row opens beside the list rather than in its place.
   *
   * @zh 显示表示该行可打开内容的箭头，默认为 `true`。当行在列表旁打开、而非替换列表时关闭它。
   */
  caret?: boolean;
  /**
   * Marks the row that is open. The selected look follows it.
   *
   * @zh 标记当前打开的行，选中样式随之变化。
   */
  "aria-current"?: AriaAttributes["aria-current"];
  /**
   * Ref to the link or button.
   *
   * @zh 指向链接或按钮的 ref。
   */
  ref?: Ref<HTMLElement>;
  /**
   * StyleX styles merged over the link's or button's own, such as an indent.
   *
   * @zh 合并在链接或按钮自身样式之上的 StyleX 样式，例如缩进。
   */
  css?: StyleProp;
}

interface ListRowLinkTarget {
  /**
   * Where the row goes. The row renders as a link.
   *
   * @zh 行的目标地址，此时行渲染为链接。
   */
  href: string;
  /**
   * The component that renders the link, such as a router's link. Defaults to
   * a plain `<a>`.
   *
   * @zh 渲染链接的组件，例如路由的链接组件。默认为普通 `<a>`。
   */
  linkComponent?: ComponentType<ListRowLinkProps>;
  onClick?: never;
}

interface ListRowButtonTarget {
  /**
   * What the row does when pressed. The row renders as a button.
   *
   * @zh 按下行时执行的操作，此时行渲染为按钮。
   */
  onClick: () => void;
  href?: never;
  linkComponent?: never;
}

type ListRowProps = ListRowBaseProps &
  (ListRowLinkTarget | ListRowButtonTarget);

/**
 * One row of a `List`: a link or a button across the whole row, at least
 * 48px tall, with a name, an optional detail line, slots at both ends, and a
 * caret that says it opens something.
 */
export function ListRow({
  children,
  detail,
  leading,
  trailing,
  actions,
  caret = true,
  "aria-current": ariaCurrent,
  ref,
  css,
  ...target
}: ListRowProps) {
  const body = (
    <>
      {leading}
      <span css={styles.main}>
        <span css={[typeRole.body, styles.title]}>{children}</span>
        {detail ? (
          <span css={[typeRole.caption, styles.detail]}>{detail}</span>
        ) : null}
      </span>
      {trailing}
      {caret && !actions ? (
        <span aria-hidden css={styles.caret}>
          <CaretRightIcon weight="bold" />
        </span>
      ) : null}
    </>
  );
  const setRef = mergeRefs(ref);
  const look = [
    transition.colors,
    selected.quiet,
    a11y.focusRingInset,
    listSurface.row,
    styles.row,
    css,
  ];

  return (
    <li css={listSurface.item}>
      {target.href === undefined ? (
        <button
          type="button"
          ref={setRef}
          aria-current={ariaCurrent}
          onClick={target.onClick}
          css={[buttonReset.base, look]}
        >
          {body}
        </button>
      ) : (
        <LinkSlot
          href={target.href}
          component={target.linkComponent}
          ref={setRef}
          aria-current={ariaCurrent}
          look={look}
        >
          {body}
        </LinkSlot>
      )}
      {actions ? <span css={styles.actions}>{actions}</span> : null}
    </li>
  );
}

function LinkSlot({
  component: LinkComponent = PlainAnchor,
  look,
  ...props
}: Omit<ListRowLinkProps, "className" | "style"> & {
  component: ComponentType<ListRowLinkProps> | undefined;
  look: StyleProp;
}) {
  return <LinkComponent {...props} {...stylex.props(look, styles.link)} />;
}

const styles = stylex.create({
  row: {
    [selectedTokens.rest]: {
      default: "transparent",
      ":active": color.bgControlPressed,
    },
    color: color.fg,
    textAlign: "start",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  },
  link: {
    textDecoration: "none",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
  title: {
    fontWeight: font.weight_5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  detail: {
    color: color.fgMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  caret: {
    display: "inline-flex",
    flexShrink: 0,
    color: color.fgMuted,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: rhythm.inline,
    paddingInlineStart: rhythm.tight,
    paddingInlineEnd: space._2,
  },
});
