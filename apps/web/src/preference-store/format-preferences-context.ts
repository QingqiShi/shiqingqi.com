import type { StoredPreference } from "./types";

export function formatPreferencesContext(
  prefs: ReadonlyArray<StoredPreference>,
): string | null {
  if (prefs.length === 0) return null;

  const likes = prefs.filter((p) => p.sentiment === "like");
  const dislikes = prefs.filter((p) => p.sentiment === "dislike");

  const lines: string[] = ["[User Preferences]"];

  if (likes.length > 0) {
    lines.push(
      "Likes: " + likes.map((p) => `${p.value} (${p.category})`).join(", "),
    );
  }

  if (dislikes.length > 0) {
    lines.push(
      "Dislikes: " +
        dislikes.map((p) => `${p.value} (${p.category})`).join(", "),
    );
  }

  return lines.join("\n");
}
