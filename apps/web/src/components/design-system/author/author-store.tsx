"use client";

import { nearestPaletteTone } from "@tuja/ui/author/palette-match";
import type { TokenEntry } from "@tuja/ui/author/token-registry";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Changeset,
  TokenEdit,
} from "#src/app/api/design-system/author/changeset-schema.ts";
import { useResolvedTheme } from "#src/hooks/use-resolved-theme.ts";
import {
  applyOverride,
  clearOverride,
  parseVarName,
  readColor,
  readScalar,
} from "./preview-engine.ts";

type ActiveTheme = "light" | "dark";

export interface DiffEntry {
  entry: TokenEntry;
  /** Set for color edits; null for theme-agnostic scalars. */
  theme: ActiveTheme | null;
  oldValue: string;
  newValue: string;
}

interface AuthorContextValue {
  activeTheme: ActiveTheme;
  diffCount: number;
  /** All pending edits, in first-edited order — drives the "Pending" list. */
  diffs: DiffEntry[];
  getDiff: (entry: TokenEntry) => DiffEntry | undefined;
  readValue: (entry: TokenEntry) => string;
  setEdit: (entry: TokenEntry, newValue: string) => void;
  resetEntry: (entry: TokenEntry) => void;
  /** Drop a specific pending edit, honoring the theme it was authored against. */
  resetDiff: (diff: DiffEntry) => void;
  resetAll: () => void;
  buildChangeset: () => Changeset;
  /**
   * The token the user clicked on the page, or null when nothing is selected.
   * Drives the slide-in sidebar: a value slides it in to that token's editor.
   */
  selectedPath: string | null;
  selectPath: (path: string) => void;
  clearSelection: () => void;
}

const AuthorContext = createContext<AuthorContextValue | null>(null);

export function useAuthor(): AuthorContextValue {
  const value = use(AuthorContext);
  if (!value) {
    throw new Error("useAuthor must be used within <AuthorProvider>");
  }
  return value;
}

function diffKey(entry: TokenEntry, theme: ActiveTheme): string {
  return entry.themed ? `${entry.path}::${theme}` : entry.path;
}

function toEdit(diff: DiffEntry): TokenEdit {
  const { entry } = diff;
  if (entry.kind === "color") {
    return {
      kind: "color",
      path: entry.path,
      theme: diff.theme ?? "light",
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      paletteSuggestion: nearestPaletteTone(diff.newValue),
    };
  }
  return {
    kind: entry.kind,
    path: entry.path,
    oldValue: diff.oldValue,
    newValue: diff.newValue,
  };
}

export function AuthorProvider({ children }: { children: ReactNode }) {
  const activeTheme = useResolvedTheme();

  // Hidden probe to resolve color tokens (a custom property has no computed
  // color on its own). Created once, appended to the document body.
  const probeRef = useRef<HTMLSpanElement | null>(null);
  // Original source values, captured once per key so re-edits keep the true
  // "from" value even after an override is live.
  const originalsRef = useRef<Map<string, string>>(new Map());
  const [diffs, setDiffs] = useState<Map<string, DiffEntry>>(() => new Map());

  // Click-to-edit selection: the token whose editor the sidebar shows.
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectPath = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);
  const clearSelection = useCallback(() => {
    setSelectedPath(null);
  }, []);

  useEffect(() => {
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    document.body.appendChild(probe);
    probeRef.current = probe;
    return () => {
      probe.remove();
      probeRef.current = null;
    };
  }, []);

  // Stable identity (refs only) so the field's read effect doesn't re-run on
  // every provider render.
  const readValue = useCallback((entry: TokenEntry): string => {
    if (entry.kind === "color") {
      const probe = probeRef.current;
      return probe ? readColor(probe, entry.ref) : "";
    }
    const varName = parseVarName(entry.ref);
    return varName ? readScalar(document.documentElement, varName) : "";
  }, []);

  function setEdit(entry: TokenEntry, newValue: string): void {
    if (!parseVarName(entry.ref)) return;
    const key = diffKey(entry, activeTheme);
    if (!originalsRef.current.has(key)) {
      originalsRef.current.set(key, readValue(entry));
    }
    const oldValue = originalsRef.current.get(key) ?? newValue;
    setDiffs((prev) => {
      const next = new Map(prev);
      next.set(key, {
        entry,
        theme: entry.themed ? activeTheme : null,
        oldValue,
        newValue,
      });
      return next;
    });
  }

  function resetEntry(entry: TokenEntry): void {
    const key = diffKey(entry, activeTheme);
    originalsRef.current.delete(key);
    setDiffs((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  function resetDiff(diff: DiffEntry): void {
    const key =
      diff.theme === null
        ? diff.entry.path
        : `${diff.entry.path}::${diff.theme}`;
    originalsRef.current.delete(key);
    setDiffs((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  function resetAll(): void {
    originalsRef.current.clear();
    setDiffs(new Map());
  }

  function getDiff(entry: TokenEntry): DiffEntry | undefined {
    return diffs.get(diffKey(entry, activeTheme));
  }

  function buildChangeset(): Changeset {
    const edits = [...diffs.values()].map(toEdit);
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      edits,
    };
  }

  // Single source of DOM mutation. Overrides go on the document root so that
  // even tokens consumed via inheritance (body text color, font family) update.
  // Scalars always apply; a color override only applies to the theme it was
  // authored against, since one CSS variable can't preview both at once. The
  // cleanup clears what this run applied — which also tears everything down on
  // unmount and when leaving the page.
  useEffect(() => {
    const root = document.documentElement;
    const applied = new Set<string>();
    for (const diff of diffs.values()) {
      // A color edit only previews on the theme it was authored against. Skip
      // off-theme diffs entirely rather than clearing their var: light and dark
      // resolve to the *same* custom property, so a clear here would wipe the
      // override the sibling-theme diff for that var just applied. Anything that
      // should no longer apply was already removed by the previous run's cleanup.
      if (diff.theme !== null && diff.theme !== activeTheme) continue;
      const varName = parseVarName(diff.entry.ref);
      if (!varName) continue;
      applyOverride(root, varName, diff.newValue);
      applied.add(varName);
    }
    return () => {
      for (const varName of applied) clearOverride(root, varName);
    };
  }, [diffs, activeTheme]);

  const value: AuthorContextValue = {
    activeTheme,
    diffCount: diffs.size,
    diffs: [...diffs.values()],
    getDiff,
    readValue,
    setEdit,
    resetEntry,
    resetDiff,
    resetAll,
    buildChangeset,
    selectedPath,
    selectPath,
    clearSelection,
  };

  return <AuthorContext value={value}>{children}</AuthorContext>;
}
