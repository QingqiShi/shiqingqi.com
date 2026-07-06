"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { scrollX } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import {
  border,
  color,
  controlSize,
  font,
  layer,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { CodeBlock } from "./code-block.tsx";
import { noteGroups, type Note } from "./notes-data.ts";

const ALL_GROUP_ID = "__all";

function matchesQuery(note: Note, q: string): boolean {
  if (q === "") return true;
  const needle = q.toLowerCase();
  if (note.title.toLowerCase().includes(needle)) return true;
  if (note.blurb.toLowerCase().includes(needle)) return true;
  if (note.tags?.some((tag) => tag.toLowerCase().includes(needle))) return true;
  if (note.notes?.some((line) => line.toLowerCase().includes(needle))) {
    return true;
  }
  if (note.code?.toLowerCase().includes(needle)) return true;
  return false;
}

export function NotesApp() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>(ALL_GROUP_ID);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Keyboard: "/" focuses search
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    return noteGroups
      .filter(
        (group) => activeGroup === ALL_GROUP_ID || group.id === activeGroup,
      )
      .map((group) => ({
        ...group,
        notes: group.notes.filter((note) => matchesQuery(note, query)),
      }))
      .filter((group) => group.notes.length > 0);
  }, [activeGroup, query]);

  const totalMatches = useMemo(
    () => filtered.reduce((sum, group) => sum + group.notes.length, 0),
    [filtered],
  );

  const expandAll = useCallback(() => {
    const ids = new Set<string>();
    for (const group of filtered)
      for (const note of group.notes) ids.add(note.id);
    setOpenIds(ids);
  }, [filtered]);

  const collapseAll = useCallback(() => {
    setOpenIds(new Set());
  }, []);

  return (
    <div css={styles.container}>
      <header css={styles.header}>
        <h1 css={styles.heading}>Notes</h1>
      </header>

      <div css={styles.toolbar}>
        <label css={styles.searchWrapper} htmlFor={searchId}>
          <MagnifyingGlassIcon css={styles.searchIcon} weight="bold" />
          <input
            id={searchId}
            ref={searchRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Search — try 'bfs', 'rate', 'curry'…"
            autoComplete="off"
            spellCheck={false}
            css={styles.searchInput}
          />
          {query !== "" ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              css={[buttonReset.base, styles.clearButton]}
              aria-label="Clear search"
            >
              <XIcon weight="bold" />
            </button>
          ) : null}
        </label>

        <div css={[flex.row, scrollX.base, styles.chipScroller]}>
          <Chip
            active={activeGroup === ALL_GROUP_ID}
            onClick={() => {
              setActiveGroup(ALL_GROUP_ID);
            }}
            label="All"
          />
          {noteGroups.map((group) => (
            <Chip
              key={group.id}
              active={activeGroup === group.id}
              onClick={() => {
                setActiveGroup(group.id);
              }}
              label={group.label}
            />
          ))}
        </div>

        <div css={[flex.between, styles.metaRow]}>
          <span css={styles.metaText}>
            {totalMatches} {totalMatches === 1 ? "entry" : "entries"}
          </span>
          <div css={[flex.row, styles.metaActions]}>
            <button
              type="button"
              onClick={expandAll}
              css={[buttonReset.base, styles.metaButton]}
            >
              Expand all
            </button>
            <span css={styles.metaSeparator} aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={collapseAll}
              css={[buttonReset.base, styles.metaButton]}
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      <div css={styles.list}>
        {filtered.length === 0 ? (
          <p css={styles.empty}>
            Nothing matches “{query}”. Try a tag like <code>graph</code> or{" "}
            <code>async</code>.
          </p>
        ) : (
          filtered.map((group) => (
            <section key={group.id} css={styles.section}>
              <h2 css={styles.sectionLabel}>{group.label}</h2>
              <div css={styles.cardList}>
                {group.notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    open={openIds.has(note.id)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      css={[
        buttonReset.base,
        transition.colors,
        styles.chip,
        active && styles.chipActive,
      ]}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

interface NoteCardProps {
  note: Note;
  open: boolean;
  onToggle: (id: string) => void;
}

function NoteCard({ note, open, onToggle }: NoteCardProps) {
  const panelId = `panel-${note.id}`;
  return (
    <article id={note.id} css={[styles.card, open && styles.cardOpen]}>
      <button
        type="button"
        onClick={() => {
          onToggle(note.id);
        }}
        css={[buttonReset.base, styles.cardHeader]}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span css={styles.cardTitle}>{note.title}</span>
        <span css={[styles.caret, open && styles.caretOpen]} aria-hidden="true">
          <CaretDownIcon weight="bold" />
        </span>
      </button>

      {open ? (
        <div id={panelId} css={styles.panel}>
          <p css={styles.cardBlurb}>{note.blurb}</p>

          {note.complexity || (note.tags && note.tags.length > 0) ? (
            <div css={[flex.wrap, styles.metaChips]}>
              {note.complexity?.time ? (
                <span css={styles.complexityItem}>
                  <span css={styles.complexityKey}>time</span>
                  <span css={styles.complexityValue}>
                    {note.complexity.time}
                  </span>
                </span>
              ) : null}
              {note.complexity?.space ? (
                <span css={styles.complexityItem}>
                  <span css={styles.complexityKey}>space</span>
                  <span css={styles.complexityValue}>
                    {note.complexity.space}
                  </span>
                </span>
              ) : null}
              {note.tags?.map((tag) => (
                <span key={tag} css={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {note.hints && note.hints.length > 0 ? (
            <dl css={styles.hintList}>
              {note.hints.map((hint) => (
                <div key={hint.trigger} css={styles.hintRow}>
                  <dt css={styles.hintTrigger}>{hint.trigger}</dt>
                  <dd css={styles.hintApproach}>{hint.approach}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {note.notes && note.notes.length > 0 ? (
            <ul css={styles.notesList}>
              {note.notes.map((line) => (
                <li key={line} css={styles.notesItem}>
                  {line}
                </li>
              ))}
            </ul>
          ) : null}

          {note.code ? <CodeBlock code={note.code} /> : null}
        </div>
      ) : null}
    </article>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
    paddingBlock: space._4,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  heading: {
    margin: 0,
    fontSize: font.uiHeading1,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  toolbar: {
    position: "sticky",
    top: `calc(env(safe-area-inset-top) + ${space._10} + ${space._1})`,
    zIndex: layer.content,
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceRaised,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_3,
    boxShadow: shadow._2,
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: space._2,
    paddingInlineStart: space._3,
    paddingInlineEnd: space._1,
    blockSize: controlSize._9,
    borderRadius: border.radius_round,
    backgroundColor: color.bgInteractiveRest,
    border: `1px solid ${color.neutralBorder}`,
  },
  searchIcon: {
    flexShrink: 0,
    inlineSize: "16px",
    blockSize: "16px",
    color: color.textSubtle,
  },
  searchInput: {
    flex: 1,
    minInlineSize: 0,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    fontSize: font.uiBody,
    color: color.textMain,
    fontFamily: font.family,
    paddingBlock: 0,
    paddingInline: 0,
  },
  clearButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minInlineSize: "32px",
    minBlockSize: "32px",
    borderRadius: border.radius_round,
    color: { default: color.textSubtle, ":hover": color.textMain },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
  },
  chipScroller: {
    gap: space._1,
    paddingBlock: space._0,
    marginInline: `calc(${space._1} * -1)`,
    paddingInline: space._1,
  },
  chip: {
    flexShrink: 0,
    paddingBlock: space._1,
    paddingInline: space._3,
    minBlockSize: "32px",
    borderRadius: border.radius_round,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    backgroundColor: {
      default: color.bgInteractiveRest,
      ":hover": color.bgInteractiveHover,
    },
    border: `1px solid ${color.neutralBorder}`,
    whiteSpace: "nowrap",
  },
  chipActive: {
    color: color.accentOn,
    backgroundColor: {
      default: color.accent,
      ":hover": color.accentHover,
    },
    borderColor: "transparent",
  },
  metaRow: {
    paddingBlock: 0,
    paddingInline: space._2,
  },
  metaText: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    fontFamily: font.familyMono,
  },
  metaActions: {
    gap: space._2,
    alignItems: "center",
  },
  metaButton: {
    fontSize: font.uiCaption,
    fontWeight: font.weight_5,
    color: { default: color.textMuted, ":hover": color.textMain },
    paddingBlock: space._0,
    paddingInline: space._1,
    minBlockSize: "32px",
    borderRadius: border.radius_1,
  },
  metaSeparator: {
    color: color.textSubtle,
    fontSize: font.uiCaption,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  sectionLabel: {
    margin: 0,
    paddingInline: space._1,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
    color: color.textSubtle,
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    border: `1px solid ${color.neutralBorder}`,
    scrollMarginBlockStart: `calc(env(safe-area-inset-top) + ${space._10} + ${controlSize._9} + ${space._9})`,
  },
  cardOpen: {
    borderColor: color.accentBorder,
    boxShadow: shadow._2,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    width: "100%",
    paddingBlock: space._2,
    paddingInline: space._3,
    textAlign: "start",
    color: color.textMain,
    cursor: "pointer",
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
    borderRadius: border.radius_2,
  },
  cardTitle: {
    flex: 1,
    minInlineSize: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
    lineHeight: font.lineHeight_2,
  },
  cardBlurb: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
  },
  tag: {
    paddingBlock: space._0,
    paddingInline: space._1,
    borderRadius: border.radius_1,
    fontSize: font.uiCaption,
    fontFamily: font.familyMono,
    color: color.textSubtle,
    backgroundColor: color.bgSurfaceSunken,
  },
  caret: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "24px",
    blockSize: "24px",
    color: color.textSubtle,
    transition: "transform 180ms ease",
  },
  caretOpen: {
    transform: "rotate(180deg)",
    color: color.textMain,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    paddingBlock: space._3,
    paddingInline: space._3,
    paddingBlockStart: 0,
  },
  metaChips: {
    gap: space._1,
  },
  complexityItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._0,
    paddingInline: space._2,
    borderRadius: border.radius_1,
    fontSize: font.uiCaption,
    fontFamily: font.familyMono,
    backgroundColor: color.surfaceAccentSubtle,
    color: color.textMain,
  },
  complexityKey: {
    color: color.textSubtle,
    textTransform: "uppercase",
    letterSpacing: font.trackingWide,
  },
  complexityValue: {
    fontWeight: font.weight_6,
  },
  hintList: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
    columnGap: space._3,
    rowGap: space._1,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceSunken,
    border: `1px solid ${color.neutralBorder}`,
  },
  hintRow: {
    display: "contents",
  },
  hintTrigger: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_3,
  },
  hintApproach: {
    margin: 0,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
    lineHeight: font.lineHeight_3,
  },
  notesList: {
    margin: 0,
    paddingInlineStart: space._5,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  notesItem: {
    fontSize: {
      default: font.uiBodySmall,
      [breakpoints.md]: font.uiBody,
    },
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
  },
  empty: {
    margin: 0,
    paddingBlock: space._6,
    paddingInline: space._3,
    fontSize: font.uiBody,
    color: color.textMuted,
    textAlign: "center",
  },
});
