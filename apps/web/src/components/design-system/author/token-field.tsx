"use client";

import * as stylex from "@stylexjs/stylex";
import type { TokenEntry } from "@tuja/ui/author/token-registry";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import { useAuthor } from "./author-store.tsx";
import { PalettePicker } from "./palette-picker.tsx";
import { parseLength } from "./preview-engine.ts";

const LENGTH_UNITS = ["rem", "px", "em", "%"];

// A complete CSS number: "1", "1.5", ".5", "-2" — but not "", "1." or "rem".
const VALID_NUMBER = /^-?(\d+|\d*\.\d+)$/;

export function TokenField({ entry }: { entry: TokenEntry }) {
  const { activeTheme, getDiff, readValue, setEdit, resetEntry } = useAuthor();
  const diff = getDiff(entry);
  const [source, setSource] = useState("");
  const fieldRef = useRef<HTMLDivElement | null>(null);

  // Re-read the source value on mount, when the theme changes (colors differ
  // per theme), and whenever the diff for this key is cleared. This syncs
  // display state from computed CSS, which is only available post-commit and
  // has no subscription to push updates — so a one-shot setState is correct.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource(readValue(entry));
  }, [readValue, entry, activeTheme, diff]);

  // Focus the first control whenever a different token is shown, so keyboard
  // editing works the instant the sidebar slides in. Keyed on the token path.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      fieldRef.current
        ?.querySelector<HTMLElement>("[data-author-control], input, select")
        ?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [entry.path]);

  const current = diff?.newValue ?? source;
  const edited = diff !== undefined;

  return (
    <div ref={fieldRef} css={styles.field}>
      <div css={styles.meta}>
        <span css={styles.path}>{entry.path}</span>
        {edited ? (
          <button
            type="button"
            css={styles.reset}
            onClick={() => {
              resetEntry(entry);
            }}
          >
            reset
          </button>
        ) : null}
      </div>
      <Editor entry={entry} current={current} onCommit={setEdit} />
    </div>
  );
}

interface EditorProps {
  entry: TokenEntry;
  current: string;
  onCommit: (entry: TokenEntry, value: string) => void;
}

function Editor({ entry, current, onCommit }: EditorProps) {
  switch (entry.kind) {
    case "color":
      return (
        <ColorEditor entry={entry} current={current} onCommit={onCommit} />
      );
    case "length":
      return (
        <LengthEditor entry={entry} current={current} onCommit={onCommit} />
      );
    case "number":
    case "integer":
      return (
        <NumberEditor entry={entry} current={current} onCommit={onCommit} />
      );
    default:
      return null;
  }
}

function ColorEditor({ entry, current, onCommit }: EditorProps) {
  return (
    <PalettePicker
      path={entry.path}
      value={current}
      onPick={(value) => {
        onCommit(entry, value);
      }}
    />
  );
}

function LengthEditor({ entry, current, onCommit }: EditorProps) {
  const parts = parseLength(current, entry.defaultUnit ?? "");
  const units =
    parts.unit !== "" && !LENGTH_UNITS.includes(parts.unit)
      ? [parts.unit, ...LENGTH_UNITS]
      : LENGTH_UNITS;

  return (
    <div css={styles.row}>
      <input
        type="number"
        step="any"
        aria-label={`${entry.path} value`}
        value={parts.value}
        css={styles.numberInput}
        onChange={(event) => {
          const raw = event.target.value;
          // Ignore empty/partial input so clearing the field never commits a
          // bare unit ("rem") or an invalid length into the token source.
          if (!VALID_NUMBER.test(raw)) return;
          onCommit(entry, `${raw}${parts.unit}`);
        }}
      />
      <select
        aria-label={`${entry.path} unit`}
        value={parts.unit}
        css={styles.unitSelect}
        onChange={(event) => {
          if (!VALID_NUMBER.test(parts.value)) return;
          onCommit(entry, `${parts.value}${event.target.value}`);
        }}
      >
        {units.map((unit) => (
          <option key={unit} value={unit}>
            {unit === "" ? "—" : unit}
          </option>
        ))}
      </select>
    </div>
  );
}

// Weights (integer) and line heights (number) — a bare numeric input. The source
// editor preserves the `stylex.types.integer/number(...)` wrapper, so we commit
// just the number with no unit.
function NumberEditor({ entry, current, onCommit }: EditorProps) {
  return (
    <div css={styles.row}>
      <input
        type="number"
        step={entry.kind === "integer" ? "1" : "any"}
        aria-label={`${entry.path} value`}
        value={current}
        css={styles.numberInput}
        onChange={(event) => {
          const raw = event.target.value;
          if (!VALID_NUMBER.test(raw)) return;
          const numeric = Number(raw);
          // Integers must be whole numbers; never write a fraction into a
          // stylex.types.integer().
          if (entry.kind === "integer" && !Number.isInteger(numeric)) return;
          // Normalize away leading/trailing zeros ("007" → "7", "1.50" → "1.5").
          const normalized = String(numeric);
          // Ignore magnitudes that stringify to exponent form ("1e-7"): that is
          // not a valid plain literal inside stylex.types.*() and the apply
          // schema would reject the whole changeset.
          if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) return;
          onCommit(entry, normalized);
        }}
      />
    </div>
  );
}

const styles = stylex.create({
  field: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._1,
  },
  path: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  reset: {
    appearance: "none",
    border: "none",
    background: "none",
    padding: 0,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.accentText,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },
  numberInput: {
    flexGrow: 1,
    minInlineSize: 0,
    paddingBlock: space._00,
    paddingInline: space._1,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMain,
    backgroundColor: color.bgSurfaceSunken,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_1,
  },
  unitSelect: {
    flexShrink: 0,
    paddingBlock: space._00,
    paddingInline: space._0,
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMain,
    backgroundColor: color.bgSurfaceSunken,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_1,
  },
});
