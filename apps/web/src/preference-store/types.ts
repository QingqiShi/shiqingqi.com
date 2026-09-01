export interface StoredPreference {
  /** Composite key: `${category}:${value}` */
  id: string;
  category:
    "genre" | "actor" | "director" | "content_rating" | "language" | "keyword";
  value: string;
  sentiment: "like" | "dislike";
  updatedAt: number;
}
