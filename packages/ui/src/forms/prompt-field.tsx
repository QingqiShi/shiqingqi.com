"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type SubmitEvent,
} from "react";
import { color } from "../color.stylex.ts";
import { mergeRefs } from "../merge-refs.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import {
  border,
  controlHeight,
  controlSize,
  font,
  opacity,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  fieldSizeInline,
  fieldStyles,
  fieldVars,
} from "./field-shared.stylex.ts";
import { pointerFocus } from "./pointer-focus.ts";

interface PromptFieldProps {
  /**
   * The accessible name of the field. It does not show: the placeholder and
   * the action say what the field is for.
   *
   * @zh 输入框的无障碍名称。它不显示：占位文字与操作按钮已说明输入框的用途。
   */
  label: string;
  /**
   * The text in the field.
   *
   * @zh 输入框中的文字。
   */
  value: string;
  /**
   * Called with the new text at each edit.
   *
   * @zh 每次编辑时以新文字调用。
   */
  onValueChange: (value: string) => void;
  /**
   * Called when the visitor sends the prompt: Enter in the field, or the
   * submit button in `action`. Enter that confirms an IME composition does
   * not send.
   *
   * @zh 访客发送提问时调用：在输入框中按 Enter，或点击 action 中的提交按钮。用于确认输入法组合的 Enter 不会发送。
   */
  onSubmit: () => void;
  /**
   * Hint text shown while the field is empty.
   *
   * @zh 输入框为空时显示的提示文字。
   */
  placeholder?: string;
  /**
   * The height of the field: `md` is that of a button or a text field, for a
   * row of controls; `lg` is for a prompt that leads a page.
   *
   * @zh 输入框的高度：md 与按钮、文本框等高，用于一行控件之中；lg 用于页面的主提问框。
   */
  size?: "md" | "lg";
  /**
   * Lets the field grow with its text, up to a few lines, and makes
   * Shift+Enter start a new line. Without it the field is one line, and
   * Shift+Enter does nothing.
   *
   * @zh 让输入框随文字增高，最多数行，并使 Shift+Enter 换行。未启用时输入框只有一行，Shift+Enter 不起作用。
   */
  multiline?: boolean;
  /**
   * Stops edits to the field.
   *
   * @zh 禁止编辑输入框。
   */
  disabled?: boolean;
  /**
   * A decorative icon before the text.
   *
   * @zh 文字之前的装饰图标。
   */
  leading?: ReactNode;
  /**
   * The control at the end of the field, usually an icon `Button` of size
   * `sm` with `type="submit"`.
   *
   * @zh 输入框末端的控件，通常是 size 为 sm、type="submit" 的图标 Button。
   */
  action: ReactNode;
  /**
   * A row above the text, inside the frame, such as the item that the prompt
   * is about.
   *
   * @zh 文字上方、边框之内的一行，例如提问所针对的条目。
   */
  header?: ReactNode;
  /**
   * Ref to the text control, to move focus to it.
   *
   * @zh 指向文字控件的 ref，用于将焦点移到其上。
   */
  ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  /**
   * StyleX styles merged over the frame's own, for where the field sits and
   * how wide it is.
   *
   * @zh 与边框自身样式合并的 StyleX 样式，用于控制输入框的位置与宽度。
   */
  css?: StyleProp;
}

/**
 * A field for a prompt: text with the action that sends it inside one frame.
 * It has the frame and the height of a `TextField`, so it sits in a row of
 * controls as one of them.
 */
export function PromptField({
  label,
  value,
  onValueChange,
  onSubmit,
  placeholder,
  size = "md",
  multiline = false,
  disabled = false,
  leading,
  action,
  header,
  ref,
  css,
}: PromptFieldProps) {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const setRef = mergeRefs(fieldRef, ref);

  const fitToText = useEffectEvent(() => {
    const field = fieldRef.current;
    if (!multiline || !field) return;
    field.style.blockSize = "auto";
    field.style.blockSize = `${String(field.scrollHeight)}px`;
  });

  useLayoutEffect(() => {
    fitToText();
  }, [value, multiline]);

  // The text wraps again when the width changes, and nothing else measures
  // the field then.
  useEffect(() => {
    window.addEventListener("resize", fitToText);
    return () => {
      window.removeEventListener("resize", fitToText);
    };
  }, []);

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    onValueChange(event.target.value);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    // Shift+Enter starts a new line where there is one to start. On one line
    // it does nothing, because an implicit submit would send half a prompt.
    if (event.shiftKey && multiline) return;
    event.preventDefault();
    if (!event.shiftKey) onSubmit();
  }

  const fieldCss = [
    stylex.defaultMarker(),
    typeRole.control,
    typeModifier.verbatim,
    styles.field,
  ];

  return (
    <form
      onSubmit={handleSubmit}
      css={[
        fieldStyles.box,
        multiline ? null : corner.squircle_round,
        fieldSizeInline[size],
        transition.colors,
        a11y.focusRingWithin,
        styles.keyboardRing,
        styles.frame,
        sizes[size],
        css,
      ]}
    >
      {header ? <div css={styles.header}>{header}</div> : null}
      <div css={styles.row}>
        {leading ? (
          <span css={[typeRole.control, styles.leading]} aria-hidden>
            {leading}
          </span>
        ) : null}
        {multiline ? (
          <textarea
            ref={setRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
              pointerFocus.onPointerDown(event);
            }}
            onBlur={(event) => {
              pointerFocus.onBlur(event);
            }}
            placeholder={placeholder}
            aria-label={label}
            disabled={disabled}
            autoComplete="off"
            enterKeyHint="send"
            css={[fieldCss, styles.multiline]}
          />
        ) : (
          <input
            ref={setRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
              pointerFocus.onPointerDown(event);
            }}
            onBlur={(event) => {
              pointerFocus.onBlur(event);
            }}
            placeholder={placeholder}
            aria-label={label}
            disabled={disabled}
            autoComplete="off"
            enterKeyHint="send"
            css={[fieldCss, styles.singleLine]}
          />
        )}
        {action}
      </div>
    </form>
  );
}

// The space between the frame and an action of size `sm` makes the action
// and the frame concentric.
const sizes = stylex.create({
  md: {
    padding: `calc((${controlHeight.md} - ${controlHeight.sm}) / 2 - ${border.size_1})`,
  },
  lg: {
    padding: `calc((${controlHeight.lg} - ${controlHeight.sm}) / 2 - ${border.size_1})`,
  },
});

const styles = stylex.create({
  frame: {
    display: "block",
    inlineSize: "100%",
    minInlineSize: 0,
    margin: 0,
    paddingInlineStart: fieldVars.paddingInline,
    borderColor: {
      default: color.input,
      [stylex.when.descendant(":focus")]: color.foreground,
    },
  },
  // As on a `TextField`: the border shows a focus that a pointer gave, so
  // the ring shows only when the keyboard moves focus to the field.
  keyboardRing: {
    outlineColor: {
      default: "transparent",
      [stylex.when.descendant(":focus-visible:not([data-pointer-focus])")]:
        color.ring,
      "@supports not selector(:has(*))": {
        default: "transparent",
        ":focus-within": color.ring,
      },
    },
  },
  header: {
    paddingBlockEnd: controlSize._1,
  },
  row: {
    display: "flex",
    alignItems: "end",
    gap: controlSize._2,
  },
  leading: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "start",
    flexShrink: 0,
    blockSize: controlHeight.sm,
    color: color.mutedForeground,
  },
  field: {
    appearance: "none",
    boxSizing: "border-box",
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: 0,
    minBlockSize: controlHeight.sm,
    margin: 0,
    paddingInline: 0,
    paddingBlock: `calc((${controlHeight.sm} - 1lh) / 2)`,
    borderStyle: "none",
    outlineStyle: "none",
    backgroundColor: "transparent",
    color: color.foreground,
    fontFamily: font.family,
    cursor: { default: "text", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": opacity.disabled },
    "::placeholder": {
      color: color.mutedForeground,
      opacity: 1,
    },
  },
  singleLine: {
    textOverflow: "ellipsis",
  },
  multiline: {
    resize: "none",
    maxBlockSize: "12lh",
    overflowY: "auto",
  },
});
