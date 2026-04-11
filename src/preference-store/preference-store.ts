import { isRecord } from "#src/utils/type-guards.ts";

const DB_NAME = "ai-chat-preferences";
const DB_VERSION = 1;
const STORE_NAME = "preferences";

export interface StoredPreference {
  /** Composite key: `${category}:${value}` */
  id: string;
  category:
    | "genre"
    | "actor"
    | "director"
    | "content_rating"
    | "language"
    | "keyword";
  value: string;
  sentiment: "like" | "dislike";
  updatedAt: number;
}

export function makeId(
  category: StoredPreference["category"],
  value: string,
): string {
  return `${category}:${value.toLowerCase()}`;
}

const validCategories: ReadonlySet<string> = new Set([
  "genre",
  "actor",
  "director",
  "content_rating",
  "language",
  "keyword",
]);
const validSentiments: ReadonlySet<string> = new Set(["like", "dislike"]);

/**
 * Runtime type guard for StoredPreference.
 *
 * IndexedDB returns untyped data — values could be corrupted or left over
 * from a previous schema version. This guard filters out malformed entries
 * so callers never see invalid shapes.
 */
export function isStoredPreference(value: unknown): value is StoredPreference {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.category === "string" &&
    validCategories.has(value.category) &&
    typeof value.value === "string" &&
    typeof value.sentiment === "string" &&
    validSentiments.has(value.sentiment) &&
    typeof value.updatedAt === "number"
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

export async function getAllPreferences(): Promise<StoredPreference[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const raw: unknown[] = request.result;
      resolve(raw.filter(isStoredPreference));
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read preferences"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function mergePreferences(
  preferences: ReadonlyArray<{
    category: StoredPreference["category"];
    value: string;
    sentiment: StoredPreference["sentiment"];
  }>,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const now = Date.now();

  for (const pref of preferences) {
    const record: StoredPreference = {
      id: makeId(pref.category, pref.value),
      category: pref.category,
      value: pref.value,
      sentiment: pref.sentiment,
      updatedAt: now,
    };
    store.put(record);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to merge preferences"));
    };
  });
}

export async function deletePreference(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to delete preference"));
    };
  });
}

export async function clearPreferences(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Failed to clear preferences"));
    };
  });
}

let cachedContext: string | null = null;
let cacheLoaded = false;
let inFlightLoad: Promise<string | null> | null = null;

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

/**
 * Load preferences from IndexedDB and update the in-memory cache.
 * Returns the formatted context string, or null if no preferences are stored.
 * The in-flight promise is tracked module-side so concurrent callers can
 * coordinate on a single load via `getPreferencesContextReady`.
 */
export function loadPreferencesContext(): Promise<string | null> {
  const p = (async () => {
    try {
      const prefs = await getAllPreferences();
      cachedContext = formatPreferencesContext(prefs);
    } catch {
      cachedContext = null;
    }
    cacheLoaded = true;
    return cachedContext;
  })();
  inFlightLoad = p;
  return p;
}

/**
 * Returns a promise that resolves once the preference cache is populated
 * (or a load has settled). If no load has been started yet, one is kicked
 * off here. Safe to await before reading `getCachedPreferencesContext()`.
 *
 * This is the race-safe coordination point: concurrent callers share the
 * same in-flight load so the first chat message can reliably wait for
 * preferences without triggering duplicate IndexedDB reads.
 */
export function getPreferencesContextReady(): Promise<string | null> {
  if (inFlightLoad) return inFlightLoad;
  return loadPreferencesContext();
}

/**
 * Synchronous accessor for the cached preferences context.
 * Returns null if the cache hasn't been loaded yet or no preferences exist.
 */
export function getCachedPreferencesContext(): string | null {
  return cacheLoaded ? cachedContext : null;
}
