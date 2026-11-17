"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Text } from "../content/text.tsx";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useControlled } from "../hooks/use-controlled.ts";
import { useVisualViewport } from "../hooks/use-visual-viewport.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import { quietSurface } from "../primitives/quiet-surface.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { popoverSurface } from "../surfaces/popover-surface.stylex.ts";
import { layer, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { matchOptions } from "./match-options.ts";
import { placeList } from "./place-list.ts";
import { TextField } from "./text-field.tsx";

/** One choice in the list of a {@link Combobox}. */
export interface ComboboxOption {
  /** Unique in the list. A pick reports it. */
  id: string;
  /** The text the field takes when the option is picked. */
  label: string;
  /** Shown under the label, such as "Groceries · 3 days ago". A search also reads it. */
  detail?: string;
  /** More words that a search reads and the list does not show, such as the name of the option in another language. */
  keywords?: string;
  /** A small mark before the label, such as an emoji. */
  leading?: ReactNode;
}

interface ComboboxSharedProps extends Omit<
  ComponentProps<"input">,
  | "size"
  | "className"
  | "style"
  | "type"
  | "role"
  | "value"
  | "defaultValue"
  | "onChange"
  | "onSelect"
  | "children"
> {
  /**
   * Visible label text. Always required for an accessible name, even when
   * hidden with `labelHidden`.
   *
   * @zh 命名字段的可见标签；即使用 `labelHidden` 隐藏，也是无障碍名称所必需的。
   */
  label: string;
  /**
   * Visually hide the label, and keep it as the accessible name.
   *
   * @zh 在视觉上隐藏标签，同时保留为无障碍名称。
   */
  labelHidden?: boolean;
  /**
   * Helper text under the label, wired with `aria-describedby`.
   *
   * @zh 标签下方的说明文字，通过 `aria-describedby` 关联。
   */
  description?: string;
  /**
   * Error message. It makes the field invalid and is read with it.
   *
   * @zh 错误消息；使字段处于无效状态，并与字段一起被读出。
   */
  error?: string;
  /**
   * Control height and padding, as on a `TextField`. Defaults to `"md"`.
   *
   * @zh 控件高度与内边距，与 `TextField` 相同。默认为 `"md"`。
   */
  size?: "sm" | "md" | "lg";
  /**
   * A decorative mark at the start of the field, such as a search glyph.
   *
   * @zh 字段开头的装饰内容，例如搜索图标。
   */
  leading?: ReactNode;
  /**
   * In a picker, every option, in the order to show them; the field finds
   * the ones that match what the visitor types. In a text field, the
   * suggestions for the text now, best first.
   *
   * @zh 选择器中为全部选项，按显示顺序排列，字段会找出与输入内容匹配的选项。自由文本字段中为针对当前文字的建议，最佳的在前。
   */
  options: readonly ComboboxOption[];
  /**
   * Shown in the list when the visitor has typed text that finds no option,
   * such as "No time zone matches". Without it, the list closes.
   *
   * @zh 当访客输入的文字找不到任何选项时，在列表中显示的文字，例如“没有匹配的时区”。不传时列表会关闭。
   */
  emptyLabel?: string;
  /**
   * StyleX styles merged over the root, composed last, such as a width.
   *
   * @zh 合并到根容器上的 StyleX 样式，最后合成，例如宽度。
   */
  css?: StyleProp;
}

interface ComboboxPickerProps extends ComboboxSharedProps {
  /**
   * The id of the picked option, or `null` for none, when the parent holds
   * it. Without `value`, the field is a picker: what the visitor types only
   * searches `options`, and the field shows the label of the picked option
   * again when it loses focus.
   *
   * @zh 由父组件持有时，已选选项的 id，未选时为 `null`。不传 `value` 时字段是一个选择器：访客输入的文字只用于搜索 `options`，字段失去焦点时重新显示已选选项的标签。
   */
  selected?: string | null;
  /**
   * The id of the option picked at first, when the field holds the pick
   * itself.
   *
   * @zh 由字段自身持有选择时，初始选中选项的 id。
   */
  defaultSelected?: string | null;
  /**
   * Called with the id of the option the visitor picks.
   *
   * @zh 访客选中选项时以其 id 调用。
   */
  onSelectedChange?: (id: string) => void;
  value?: undefined;
  onValueChange?: undefined;
  onSelect?: undefined;
  createLabel?: undefined;
  onCreate?: undefined;
}

interface ComboboxTextProps extends ComboboxSharedProps {
  /**
   * The text in the field. With it, the field is a text field with
   * suggestions: the text is the value, also when it names no option.
   *
   * @zh 字段中的文字。传入后字段是带建议的文本字段：文字本身就是值，即使它不对应任何选项。
   */
  value: string;
  /**
   * Called with the text as the visitor types.
   *
   * @zh 访客输入时以当前文字调用。
   */
  onValueChange: (value: string) => void;
  /**
   * Called with the suggestion the visitor picks.
   *
   * @zh 访客选中建议时调用。
   */
  onSelect: (option: ComboboxOption) => void;
  /**
   * The text of a last option that makes a new item of the text, such as
   * `New payee “Tesco”`. It shows while the text names no option.
   *
   * @zh 列表末尾“新建”选项的文字，例如 `新商家“Tesco”`。只在文字不对应任何选项时显示。
   */
  createLabel?: (text: string) => string;
  /**
   * Called with the text when the visitor picks the `createLabel` option.
   *
   * @zh 访客选中 `createLabel` 选项时以当前文字调用。
   */
  onCreate?: (text: string) => void;
  selected?: undefined;
  defaultSelected?: undefined;
  onSelectedChange?: undefined;
}

type ComboboxProps = ComboboxPickerProps | ComboboxTextProps;

/**
 * A text field with a list of options under it (the ARIA 1.2 combobox with
 * a listbox popup). Without `value`, it is a picker for one option of many,
 * such as a time zone: typing searches the options by the start of each
 * word of the label and the detail, and the field shows the picked option.
 * Focus or a tap selects that text, so typing replaces it, and the list
 * opens at the picked option. Its `name` posts the id of the picked option.
 * With `value`, it is a text field whose suggestions the caller gives, such
 * as payees, and can offer to make a new one.
 *
 * Focus stays in the field: Up and Down move the active option, Enter picks
 * it, Escape closes the list. With text typed, the first option is active,
 * so Enter picks it at once; with the list closed, Enter goes to
 * `onKeyDown`, such as to save the form. The list opens above the field
 * when the screen, less an on-screen keyboard, has more room there.
 */
export function Combobox(props: ComboboxProps) {
  const {
    label,
    labelHidden,
    description,
    error,
    size,
    leading,
    options,
    emptyLabel,
    css,
    selected: selectedProp,
    defaultSelected = null,
    onSelectedChange,
    value,
    onValueChange,
    onSelect,
    createLabel,
    onCreate,
    onKeyDown,
    onFocus,
    onClick,
    onMouseUp,
    onBlur,
    ref,
    name,
    ...rest
  } = props;
  const isPicker = value === undefined;
  const [selected, setSelected] = useControlled({
    controlled: selectedProp,
    defaultValue: defaultSelected,
  });
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${String(index)}`;
  const [open, setOpen] = useState(false);
  // While the field shows the picked option, -1 makes it the active one,
  // also when the options change, as a caller can give them only on focus.
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const coverRef = useEffectCover();
  const viewport = useVisualViewport();

  const picked = isPicker
    ? options.find((option) => option.id === selected)
    : undefined;
  const text = isPicker ? (query ?? picked?.label ?? "") : value;
  const shown =
    isPicker && query !== null ? matchOptions(options, query) : options;
  const trimmed = text.trim();
  const exact = shown.some(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate =
    !isPicker && createLabel !== undefined && trimmed !== "" && !exact;
  const count = shown.length + (showCreate ? 1 : 0);
  const isTyped = isPicker ? query !== null && trimmed !== "" : trimmed !== "";
  const showEmpty =
    emptyLabel !== undefined && emptyLabel !== "" && count === 0 && isTyped;
  const expanded = open && (count > 0 || showEmpty);
  const pickedIndex = picked === undefined ? -1 : shown.indexOf(picked);
  const showsPick = isPicker && query === null;
  const activeIndex =
    active === -1 && showsPick ? pickedIndex : active < count ? active : -1;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const list = listRef.current;
    if (!expanded || !viewport || !root || !input || !list) return;
    placeList(viewport, root, input, list);
  }, [expanded, viewport, count]);

  const wasExpandedRef = useRef(false);
  const isFocusClickRef = useRef(false);
  useLayoutEffect(() => {
    const list = listRef.current;
    const isOpening =
      expanded && (!wasExpandedRef.current || (active === -1 && showsPick));
    wasExpandedRef.current = expanded;
    if (!expanded || !list) return;
    const option = activeIndex === -1 ? null : list.children.item(activeIndex);
    if (!(option instanceof HTMLElement)) {
      if (isOpening) list.scrollTop = 0;
      return;
    }
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (isOpening) {
      list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2;
    } else if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [expanded, active, activeIndex, showsPick, text]);

  const close = () => {
    setOpen(false);
    setActive(-1);
    setQuery(null);
  };

  const pick = (index: number) => {
    close();
    const option = shown.at(index);
    if (isPicker) {
      if (option) {
        setSelected(option.id);
        onSelectedChange?.(option.id);
      }
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input === document.activeElement) input?.select();
      });
      return;
    }
    if (option) onSelect(option);
    else if (index === shown.length) onCreate?.(trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    isFocusClickRef.current = false;
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        if (!expanded) {
          setOpen(true);
          setActive(Math.max(0, pickedIndex));
        } else if (count > 0) {
          setActive((activeIndex + 1) % count);
        }
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (!expanded) {
          setOpen(true);
          setActive(pickedIndex === -1 ? count - 1 : pickedIndex);
        } else if (count > 0) {
          setActive(activeIndex <= 0 ? count - 1 : activeIndex - 1);
        }
        return;
      }
      case "Enter": {
        if (expanded && activeIndex !== -1) {
          event.preventDefault();
          pick(activeIndex);
          return;
        }
        // A search that finds nothing must not send the form with the old pick.
        if (isPicker && query !== null) {
          event.preventDefault();
          return;
        }
        setOpen(false);
        break;
      }
      case "Escape": {
        if (expanded || query !== null) {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        break;
      }
      case "Tab": {
        setOpen(false);
        break;
      }
    }
    onKeyDown?.(event);
  };

  return (
    <div ref={rootRef} css={[styles.root, css]}>
      {isPicker && name !== undefined ? (
        <input type="hidden" name={name} value={selected ?? ""} />
      ) : null}
      <TextField
        {...rest}
        name={isPicker ? undefined : name}
        ref={mergeRefs(ref, inputRef)}
        label={label}
        labelHidden={labelHidden}
        description={description}
        error={error}
        size={size}
        leading={leading}
        trailing={isPicker ? <CaretDownIcon weight="bold" /> : undefined}
        value={text}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && activeIndex !== -1 ? optionId(activeIndex) : undefined
        }
        onChange={(event) => {
          const next = event.target.value;
          if (isPicker) setQuery(next);
          else onValueChange(next);
          setOpen(true);
          setActive(next.trim() === "" ? -1 : 0);
        }}
        onFocus={(event) => {
          setOpen(true);
          if (isPicker) {
            event.target.select();
            setActive(-1);
            isFocusClickRef.current = true;
          }
          onFocus?.(event);
        }}
        onClick={(event) => {
          if (!expanded) {
            setOpen(true);
            if (isPicker) setActive(-1);
          }
          // Typing after a tap replaces the picked option's text.
          if (showsPick) event.currentTarget.select();
          onClick?.(event);
        }}
        onMouseUp={(event) => {
          // A browser puts the caret where the pointer lets go: Safari after
          // focus selected the text, and each browser in selected text.
          // Thus stop that on the press that gave focus, and while the field
          // shows the picked option.
          if (isFocusClickRef.current || showsPick) event.preventDefault();
          isFocusClickRef.current = false;
          onMouseUp?.(event);
        }}
        onBlur={(event) => {
          isFocusClickRef.current = false;
          close();
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
      />
      <ul
        ref={mergeRefs(coverRef, listRef)}
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!expanded}
        css={[
          popoverSurface.base,
          popoverSurface.enter,
          corner.radius_2,
          styles.list,
        ]}
      >
        {(expanded ? shown : []).map((option, index) => (
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            css={rowStyles}
            onMouseDown={keepFocus}
            onClick={() => {
              pick(index);
            }}
            onMouseMove={() => {
              if (index !== activeIndex) setActive(index);
            }}
          >
            {option.leading ? (
              <span css={[typeRole.body, styles.leading]} aria-hidden>
                {option.leading}
              </span>
            ) : null}
            <span css={[flex.col, styles.text]}>
              <Text as="span" look="control" lines={1}>
                {option.label}
              </Text>
              {option.detail ? (
                <Text as="span" look="caption" tone="muted" lines={1}>
                  {option.detail}
                </Text>
              ) : null}
            </span>
            {isPicker && option.id === selected ? (
              <CheckIcon
                weight="bold"
                aria-hidden
                {...stylex.props(styles.check)}
              />
            ) : null}
          </li>
        ))}
        {expanded && showCreate ? (
          <li
            id={optionId(shown.length)}
            role="option"
            aria-selected={activeIndex === shown.length}
            css={rowStyles}
            onMouseDown={keepFocus}
            onClick={() => {
              pick(shown.length);
            }}
            onMouseMove={() => {
              if (activeIndex !== shown.length) setActive(shown.length);
            }}
          >
            <Text as="span" look="control" tone="muted" lines={1}>
              {createLabel(trimmed)}
            </Text>
          </li>
        ) : null}
        {showEmpty ? (
          <li role="presentation" css={styles.empty}>
            <Text as="span" look="control" tone="muted">
              {emptyLabel}
            </Text>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function keepFocus(event: MouseEvent) {
  event.preventDefault();
}

const styles = stylex.create({
  root: {
    position: "relative",
    minInlineSize: 0,
  },
  // Its place and its height come from `placeList`, which reads the room
  // on the screen when the list opens.
  list: {
    position: "absolute",
    insetInline: 0,
    zIndex: layer.overlay,
    margin: 0,
    padding: space._0,
    listStyle: "none",
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  // The fill follows the pointer and the arrow keys, so it changes at once.
  option: {
    alignItems: "center",
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._2,
    minInlineSize: 0,
    transition: null,
  },
  leading: {
    flexShrink: 0,
    inlineSize: "1.5em",
    textAlign: "center",
  },
  text: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  check: {
    flexShrink: 0,
  },
  empty: {
    paddingBlock: space._1,
    paddingInline: space._2,
  },
});

const rowStyles = [
  flex.row,
  corner.radius_1,
  quietSurface.interactive,
  a11y.touchRow,
  styles.option,
];
