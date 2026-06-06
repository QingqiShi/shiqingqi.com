"use client";

import * as stylex from "@stylexjs/stylex";
import type { TokenEntry } from "@tuja/ui/author/token-registry";
import { findEditableToken } from "@tuja/ui/author/token-registry";
import { border, color, font, layer, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { type DiffEntry, useAuthor } from "./author-store.tsx";
import { TokenField } from "./token-field.tsx";
import { type AppliedEdit, submitChangeset } from "./transport-client.ts";

// The author sidebar. It stays mounted for the whole author session but slides
// off-screen until a specimen is clicked. On selection it slides in showing just
// that token's editor, the running list of other pending edits, and the apply
// footer that writes the changes straight to tokens.stylex.ts.
export function AuthorPanel() {
  const { selectedPath, clearSelection } = useAuthor();
  const entry = selectedPath ? findEditableToken(selectedPath) : undefined;
  const open = entry !== undefined;

  return (
    <aside
      css={[styles.panel, open && styles.panelOpen]}
      aria-label="Design token author"
      aria-hidden={!open}
    >
      <header css={styles.header}>
        <span css={styles.eyebrow}>Author</span>
        <button
          type="button"
          css={styles.close}
          aria-label="Close editor"
          onClick={clearSelection}
        >
          <span aria-hidden>✕</span>
        </button>
      </header>

      <div css={styles.body}>
        {entry ? <SelectedEditor entry={entry} /> : <EmptyHint />}
        <PendingList />
      </div>

      <ApplyFooter />
    </aside>
  );
}

function EmptyHint() {
  return <p css={styles.empty}>Click any specimen on the page to edit it.</p>;
}

function SelectedEditor({ entry }: { entry: TokenEntry }) {
  const { activeTheme } = useAuthor();
  return (
    <section css={styles.selected}>
      <div css={styles.selectedHead}>
        <span css={styles.selectedLabel}>{entry.label}</span>
        {entry.kind === "color" ? (
          <span css={styles.themeBadge}>{activeTheme}</span>
        ) : null}
      </div>
      <TokenField entry={entry} />
    </section>
  );
}

function PendingList() {
  const { activeTheme, diffs, selectedPath, selectPath, resetDiff, resetAll } =
    useAuthor();
  if (diffs.length === 0) return null;

  return (
    <section css={styles.pending}>
      <div css={styles.pendingHead}>
        <span css={styles.pendingTitle}>Pending ({diffs.length})</span>
        <button type="button" css={styles.textButton} onClick={resetAll}>
          Reset all
        </button>
      </div>
      <ul css={styles.pendingList}>
        {diffs.map((diff) => (
          <PendingRow
            key={
              diff.theme ? `${diff.entry.path}::${diff.theme}` : diff.entry.path
            }
            diff={diff}
            // The editor shows the active theme, so only highlight the row for
            // that theme when a token has edits pending in both.
            active={
              diff.entry.path === selectedPath &&
              (diff.theme === null || diff.theme === activeTheme)
            }
            onSelect={() => {
              selectPath(diff.entry.path);
            }}
            onReset={() => {
              resetDiff(diff);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function PendingRow({
  diff,
  active,
  onSelect,
  onReset,
}: {
  diff: DiffEntry;
  active: boolean;
  onSelect: () => void;
  onReset: () => void;
}) {
  const isColor = diff.entry.kind === "color";
  return (
    <li css={[styles.pendingRow, active && styles.pendingRowActive]}>
      <button type="button" css={styles.pendingSelect} onClick={onSelect}>
        {isColor ? (
          <span
            aria-hidden
            css={styles.pendingSwatch}
            style={{ backgroundColor: diff.newValue }}
          />
        ) : null}
        <span css={styles.pendingPath}>
          {diff.entry.path}
          {diff.theme ? (
            <span css={styles.pendingTheme}> · {diff.theme}</span>
          ) : null}
        </span>
        <span css={styles.pendingValue}>{diff.newValue}</span>
      </button>
      <button
        type="button"
        css={styles.pendingReset}
        aria-label={`Reset ${diff.entry.path}`}
        onClick={onReset}
      >
        <span aria-hidden>✕</span>
      </button>
    </li>
  );
}

// Applies the pending edits straight to tokens.stylex.ts via /apply. No agent,
// no polling: the response says exactly what was written, then the live preview
// overrides are dropped so HMR's recompiled source takes over.
function ApplyFooter() {
  const { diffCount, buildChangeset, resetAll } = useAuthor();
  const [status, setStatus] = useState<
    "idle" | "applying" | "applied" | "error"
  >("idle");
  const [appliedEdits, setAppliedEdits] = useState<AppliedEdit[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleApply(): Promise<void> {
    setStatus("applying");
    setErrorMessage(null);
    const outcome = await submitChangeset(buildChangeset());
    if (outcome.ok) {
      setAppliedEdits(outcome.edits);
      setStatus("applied");
      // Drop the in-browser CSS-var overrides (and the pending list) so the page
      // reflects the recompiled source (HMR rebuilds tokens.stylex.ts) rather
      // than the now-stale preview. The panel stays open so the "Applied"
      // confirmation remains visible until the user dismisses it.
      resetAll();
      return;
    }
    setStatus("error");
    setErrorMessage(
      outcome.status === 0
        ? "Couldn’t reach the dev server."
        : (outcome.error ?? `Apply failed (${String(outcome.status)}).`),
    );
  }

  function handleDismiss(): void {
    setStatus("idle");
    setAppliedEdits([]);
    setErrorMessage(null);
  }

  if (status === "applied") {
    return (
      <footer css={styles.footer}>
        <div css={styles.status}>
          <span css={styles.statusLabel}>
            Applied to{" "}
            <span css={styles.statusFile}>
              packages/ui/src/tokens.stylex.ts
            </span>
          </span>
          <ul css={styles.fileList}>
            {appliedEdits.map((edit) => (
              <li key={`${edit.path}::${edit.theme ?? ""}`} css={styles.file}>
                {edit.path}
                {edit.theme ? ` · ${edit.theme}` : ""} → {edit.value}
              </li>
            ))}
          </ul>
          {appliedEdits.map((edit) =>
            edit.drift ? (
              <p
                key={`${edit.path}::${edit.theme ?? ""}::drift`}
                css={styles.driftNote}
              >
                {edit.drift}
              </p>
            ) : null,
          )}
        </div>
        <button
          type="button"
          css={styles.primaryButton}
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </footer>
    );
  }

  return (
    <footer css={styles.footer}>
      {status === "error" && errorMessage ? (
        <p css={styles.error}>{errorMessage}</p>
      ) : null}
      <button
        type="button"
        css={styles.primaryButton}
        disabled={diffCount === 0 || status === "applying"}
        onClick={() => {
          void handleApply();
        }}
      >
        {status === "applying"
          ? "Applying…"
          : `Apply ${String(diffCount)} ${diffCount === 1 ? "change" : "changes"}`}
      </button>
    </footer>
  );
}

const PANEL_BORDER = `inset 0 0 0 1px ${color.neutralBorder}`;

const styles = stylex.create({
  panel: {
    position: "fixed",
    insetBlock: 0,
    insetInlineEnd: 0,
    inlineSize: "min(360px, 92vw)",
    zIndex: layer.toaster,
    display: "flex",
    flexDirection: "column",
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `${PANEL_BORDER}, -8px 0 24px rgba(0,0,0,0.18)`,
    color: color.textMain,
    // Slide in from the right edge; hidden and inert until a token is picked.
    transform: "translateX(100%)",
    transitionProperty: "transform",
    transitionDuration: "240ms",
    transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.3, 1)",
    pointerEvents: "none",
    visibility: "hidden",
  },
  panelOpen: {
    transform: "translateX(0)",
    pointerEvents: "auto",
    visibility: "visible",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    padding: space._3,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: color.neutralBorder,
  },
  eyebrow: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
  },
  close: {
    appearance: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._5,
    blockSize: space._5,
    border: "none",
    borderRadius: border.radius_round,
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
    color: color.textMuted,
    fontSize: font.uiBodySmall,
    cursor: "pointer",
  },
  body: {
    flexGrow: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    padding: space._3,
  },
  empty: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  selected: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  selectedHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  selectedLabel: {
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
  },
  themeBadge: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textMuted,
    paddingBlock: space._00,
    paddingInline: space._1,
    borderRadius: border.radius_round,
    boxShadow: PANEL_BORDER,
  },
  pending: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.neutralBorder,
    paddingBlockStart: space._3,
  },
  pendingHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
  },
  pendingTitle: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    color: color.textMuted,
  },
  pendingList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  pendingRow: {
    display: "flex",
    alignItems: "center",
    gap: space._0,
    borderRadius: border.radius_1,
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
  },
  pendingRowActive: {
    backgroundColor: color.surfaceAccentSubtle,
  },
  pendingSelect: {
    appearance: "none",
    flexGrow: 1,
    minInlineSize: 0,
    display: "flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._0,
    paddingInline: space._1,
    border: "none",
    background: "none",
    textAlign: "start",
    cursor: "pointer",
  },
  pendingSwatch: {
    inlineSize: space._2,
    blockSize: space._2,
    flexShrink: 0,
    borderRadius: border.radius_1,
    boxShadow: PANEL_BORDER,
  },
  pendingPath: {
    flexShrink: 1,
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textMain,
  },
  pendingTheme: {
    color: color.textSubtle,
  },
  pendingValue: {
    marginInlineStart: "auto",
    flexShrink: 0,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.accentText,
  },
  pendingReset: {
    appearance: "none",
    flexShrink: 0,
    border: "none",
    background: "none",
    paddingBlock: space._0,
    paddingInline: space._1,
    color: {
      default: color.textSubtle,
      ":hover": color.dangerText,
    },
    fontSize: font.uiOverline,
    cursor: "pointer",
  },
  textButton: {
    appearance: "none",
    border: "none",
    background: "none",
    padding: 0,
    fontSize: font.uiCaption,
    color: {
      default: color.accentText,
      ":disabled": color.textSubtle,
    },
    cursor: {
      default: "pointer",
      ":disabled": "default",
    },
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    padding: space._3,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.neutralBorder,
  },
  status: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  statusLabel: {
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  statusFile: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textMain,
  },
  fileList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  file: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.successText,
  },
  driftNote: {
    margin: 0,
    fontSize: font.uiOverline,
    color: color.warningText,
  },
  error: {
    margin: 0,
    fontSize: font.uiOverline,
    color: color.dangerText,
  },
  primaryButton: {
    appearance: "none",
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    border: "none",
    borderRadius: border.radius_2,
    backgroundColor: {
      default: color.accent,
      ":disabled": color.bgInteractiveDisabled,
    },
    color: {
      default: color.accentOn,
      ":disabled": color.textSubtle,
    },
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    cursor: {
      default: "pointer",
      ":disabled": "default",
    },
  },
});
