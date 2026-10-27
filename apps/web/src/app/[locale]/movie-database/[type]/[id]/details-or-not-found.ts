import { notFound } from "next/navigation";
import { TmdbNotFoundError } from "#src/movie-database/tmdb/tmdb-get.ts";

export async function detailsOrNotFound<T>(details: Promise<T>): Promise<T> {
  try {
    return await details;
  } catch (error) {
    if (error instanceof TmdbNotFoundError) notFound();
    throw error;
  }
}
