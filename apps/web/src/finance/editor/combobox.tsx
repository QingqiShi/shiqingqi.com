"use client";

import * as stylex from "@stylexjs/stylex";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, layer, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

export interface ComboboxOption {
  id: string;
  /** The text the field takes when the option is picked. */
  label: string;
  /** Shown under the label, such as "Groceries · 3 days ago". */
  detail?: string;
  leading?: ReactNode;
}

interface ComboboxProps {
  label: string;
  labelHidden?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  /** The options for the current text, best first. */
  options: readonly ComboboxOption[];
  onSelect: (option: ComboboxOption) => void;
  /** Shown as the last option when the text names no option; typing a new name keeps it. */
  createLabel?: (value: string) => string;
  /** Called when the person picks the `createLabel` option. */
  onCreate?: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  /** The keys the list does not use, such as Enter with the list closed. */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Called when the list closes because focus left the field. */
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
}

/**
 * A text field with a list of suggestions (the ARIA 1.2 combobox with a
 * listbox popup). Focus stays in the field: Up and Down move the active
 * option, Enter picks it, Escape closes the list. With text typed, the best
 * option is active, so Enter picks it at once; with the list closed, Enter
 * goes to `onKeyDown`, such as to save the form.
 */
export function Combobox({
  label,
  labelHidden,
  value,
  onValueChange,
  options,
  onSelect,
  createLabel,
  onCreate,
  placeholder,
  description,
  error,
  onKeyDown,
  onBlur,
  inputRef,
  autoFocus,
}: ComboboxProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${String(index)}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = value.trim();
  const exact = options.some(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = Boolean(createLabel) && trimmed !== "" && !exact;
  const count = options.length + (showCreate ? 1 : 0);
  const expanded = open && count > 0;
  const activeIndex = active < count ? active : -1;

  const pick = (index: number) => {
    setOpen(false);
    setActive(-1);
    const option = options.at(index);
    if (option) onSelect(option);
    else if (index === options.length) onCreate?.(trimmed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        if (!expanded) {
          setOpen(true);
          setActive(0);
        } else {
          setActive((activeIndex + 1) % count);
        }
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (!expanded) {
          setOpen(true);
          setActive(count - 1);
        } else {
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
        setOpen(false);
        break;
      }
      case "Escape": {
        if (expanded) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          setActive(-1);
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
    <div css={styles.root}>
      <TextField
        ref={inputRef}
        label={label}
        labelHidden={labelHidden}
        description={description}
        error={error}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="done"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && activeIndex !== -1 ? optionId(activeIndex) : undefined
        }
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActive(event.target.value.trim() === "" ? -1 : 0);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onClick={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
      />
      <ul
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
        {options.map((option, index) => (
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            css={[flex.row, selected.quiet, corner.radius_1, styles.option]}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
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
              <span css={[typeRole.control, truncate.base]}>
                {option.label}
              </span>
              {option.detail ? (
                <span css={[typeRole.caption, truncate.base, styles.detail]}>
                  {option.detail}
                </span>
              ) : null}
            </span>
          </li>
        ))}
        {showCreate && createLabel ? (
          <li
            id={optionId(options.length)}
            role="option"
            aria-selected={activeIndex === options.length}
            css={[flex.row, selected.quiet, corner.radius_1, styles.option]}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              pick(options.length);
            }}
          >
            <span css={[typeRole.control, truncate.base, styles.detail]}>
              {createLabel(trimmed)}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

const styles = stylex.create({
  root: {
    position: "relative",
    minInlineSize: 0,
  },
  list: {
    position: "absolute",
    insetInline: 0,
    insetBlockStart: `calc(100% + ${space._0})`,
    zIndex: layer.overlay,
    margin: 0,
    padding: space._0,
    listStyle: "none",
    maxBlockSize: "18rem",
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  option: {
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._2,
    cursor: "pointer",
    minInlineSize: 0,
  },
  leading: {
    flexShrink: 0,
    inlineSize: "1.5em",
    textAlign: "center",
  },
  text: {
    minInlineSize: 0,
  },
  detail: {
    color: color.fgMuted,
  },
});
