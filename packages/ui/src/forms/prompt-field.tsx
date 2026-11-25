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
import { promptFieldVars } from "./prompt-field.stylex.ts";

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
   * Hint text shown while the field is empty. Beside the action it stays on
   * one line, and ends in an ellipsis where it has no room. With `tools` it
   * wraps.
   *
   * @zh 输入框为空时显示的提示文字。与操作按钮并排时保持一行，放不下时以省略号结尾；有 tools 时可以换行。
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
   * Controls at the start of a row under the text, such as a button that adds
   * files. With them, the text has the full width of the frame and `action`
   * goes to the end of that row, as in a prompt that starts a conversation.
   *
   * @zh 文字下方一行起始处的控件，例如添加文件的按钮。有了它，文字占满边框的宽度，action 移到这一行的末端，适用于开始一段对话的提问框。
   */
  tools?: ReactNode;
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
  tools,
  header,
  ref,
  css,
}: PromptFieldProps) {
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const setRef = mergeRefs(fieldRef, ref);

  const fitToText = useEffectEvent(() => {
    const field = fieldRef.current;
    if (!multiline || !field) return;
    // Above a keyboard on a small screen, twelve lines are more than the
    // visitor sees. The field takes at most two fifths of the visible area,
    // so that the action and what is above the field stay in view. A zoom
    // does not change the limit.
    const viewport = window.visualViewport;
    const visible = viewport
      ? viewport.height * viewport.scale
      : window.innerHeight;
    field.style.maxBlockSize = `min(${MAX_BLOCK_SIZE}, ${String(Math.round(visible * 0.4))}px)`;
    field.style.blockSize = "auto";
    field.style.blockSize = `${String(field.scrollHeight)}px`;
  });

  useLayoutEffect(() => {
    fitToText();
  }, [value, multiline]);

  // The text wraps again when the width changes, and nothing else measures
  // the field then. A keyboard changes only the visual viewport.
  useEffect(() => {
    const viewport = window.visualViewport;
    window.addEventListener("resize", fitToText);
    viewport?.addEventListener("resize", fitToText);
    return () => {
      window.removeEventListener("resize", fitToText);
      viewport?.removeEventListener("resize", fitToText);
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

  const isStacked = tools !== undefined;
  const fieldCss = [
    stylex.defaultMarker(),
    typeRole.control,
    typeModifier.verbatim,
    styles.field,
    isStacked ? styles.stackedField : styles.rowField,
  ];

  return (
    <form
      onSubmit={handleSubmit}
      css={[
        fieldStyles.box,
        multiline ? null : corner.squircle_round,
        isStacked && corner.radius_5,
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
      <div css={[styles.row, isStacked && styles.stackedRow]}>
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
            onFocus={(event) => {
              pointerFocus.onFocus(event);
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
            onFocus={(event) => {
              pointerFocus.onFocus(event);
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
        {isStacked ? (
          <div css={styles.toolRow}>
            <div css={styles.tools}>{tools}</div>
            {action}
          </div>
        ) : (
          action
        )}
      </div>
    </form>
  );
}

const MAX_BLOCK_SIZE = "12lh";
const MD_INSET = `calc((${controlHeight.md} - ${controlHeight.sm}) / 2 - ${border.size_1})`;
const LG_INSET = `calc((${controlHeight.lg} - ${controlHeight.sm}) / 2 - ${border.size_1})`;

// The space between the frame and an action of size `sm` makes the action
// and the frame concentric.
const sizes = stylex.create({
  md: {
    [promptFieldVars.actionInset]: MD_INSET,
    padding: MD_INSET,
  },
  lg: {
    [promptFieldVars.actionInset]: LG_INSET,
    padding: LG_INSET,
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
  // Beside its action, the field is one line high while it is empty, so the
  // hint stays on one line. A `textarea` wraps its hint by default, and
  // Safari adds the lines of the hint to the height of the field.
  rowField: {
    "::placeholder": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  },
  stackedRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: controlSize._1,
  },
  // With `tools`, the text keeps the inline padding of the frame on both
  // sides, and the row under it starts at the inset of the action at its end,
  // so that the controls in both corners are concentric with the frame.
  stackedField: {
    flexBasis: "auto",
    minBlockSize: `calc(1lh + ${controlHeight.sm})`,
    paddingInlineEnd: `calc(${fieldVars.paddingInline} - ${promptFieldVars.actionInset})`,
  },
  toolRow: {
    display: "flex",
    alignItems: "center",
    gap: controlSize._2,
    marginInlineStart: `calc(${promptFieldVars.actionInset} - ${fieldVars.paddingInline})`,
  },
  tools: {
    display: "flex",
    alignItems: "center",
    gap: controlSize._1,
    flexGrow: 1,
    minInlineSize: 0,
  },
  singleLine: {
    textOverflow: "ellipsis",
  },
  // As `fieldStyles.multiline`: a field fills each line.
  multiline: {
    resize: "none",
    textWrap: "wrap",
    maxBlockSize: MAX_BLOCK_SIZE,
    overflowY: "auto",
  },
});
