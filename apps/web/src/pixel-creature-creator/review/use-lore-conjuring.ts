import { useState } from "react";
import type { CreatureDef } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import type { LoreData } from "./creature-card";

export type LoreFetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; reason: "rate_limited" | "generic" };

interface LoreApiSuccess {
  nameSuggestion: string;
  loreEn: string;
  loreZh: string;
  type: string;
}

function isLoreApiSuccess(value: unknown): value is LoreApiSuccess {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.nameSuggestion === "string" &&
    typeof candidate.loreEn === "string" &&
    typeof candidate.loreZh === "string" &&
    typeof candidate.type === "string"
  );
}

interface LoreConjuringOptions {
  def: CreatureDef;
  locale: string;
  onLoreChange: (lore: LoreData | null) => void;
}

export function useLoreConjuring({
  def,
  locale,
  onLoreChange,
}: LoreConjuringOptions) {
  const [loreFetch, setLoreFetch] = useState<LoreFetchState>({ kind: "idle" });
  const [manualLore, setManualLore] = useState("");

  const handleConjureLore = async () => {
    // Guard against rapid double-clicks: the disabled prop on the button
    // catches up only after React commits the loading state, so a second
    // activation in the same tick can still fire. Bail synchronously here
    // to keep the request count to one per intent.
    if (loreFetch.kind === "loading") return;
    setLoreFetch({ kind: "loading" });
    try {
      const response = await fetch("/api/pixel-creature-creator/lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ def, locale }),
      });
      if (response.status === 429) {
        setLoreFetch({ kind: "error", reason: "rate_limited" });
        return;
      }
      if (!response.ok) {
        setLoreFetch({ kind: "error", reason: "generic" });
        return;
      }
      const json: unknown = await response.json();
      if (!isLoreApiSuccess(json)) {
        setLoreFetch({ kind: "error", reason: "generic" });
        return;
      }
      onLoreChange({ loreEn: json.loreEn, loreZh: json.loreZh });
      setLoreFetch({ kind: "idle" });
    } catch {
      setLoreFetch({ kind: "error", reason: "generic" });
    }
  };

  const handleManualLoreSubmit = () => {
    const trimmed = manualLore.trim();
    if (trimmed.length === 0) return;
    // Manual lore lives in whichever locale the user wrote it in; we mirror
    // it into both halves so the card renders correctly regardless of the
    // active locale and the PNG export still has something to show.
    onLoreChange({ loreEn: trimmed, loreZh: trimmed });
    setLoreFetch({ kind: "idle" });
    setManualLore("");
  };

  return {
    loreFetch,
    manualLore,
    setManualLore,
    handleConjureLore,
    handleManualLoreSubmit,
  };
}
