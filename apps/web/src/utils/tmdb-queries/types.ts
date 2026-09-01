/** Addresses one Media for every query that reads a single record. */
export interface MediaDetailsParams {
  type: "movie" | "tv";
  id: string;
  language?: string;
}

/** Addresses one Person for every query that reads a single record. */
export interface PersonDetailsParams {
  id: string;
  language?: string;
}
