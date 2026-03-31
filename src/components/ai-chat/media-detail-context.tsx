"use client";

import { createContext, use, useState, type PropsWithChildren } from "react";

export interface FocusedMedia {
  id: number;
  mediaType: "movie" | "tv";
  title?: string | null;
  posterPath?: string | null;
}

export interface FocusedPerson {
  id: number;
  name?: string | null;
  profilePath?: string | null;
}

interface MediaDetailState {
  focusedMedia: FocusedMedia | null;
  setFocusedMedia: (media: FocusedMedia | null) => void;
  focusedPerson: FocusedPerson | null;
  setFocusedPerson: (person: FocusedPerson | null) => void;
}

const MediaDetailContext = createContext<MediaDetailState | null>(null);

export function MediaDetailProvider({ children }: PropsWithChildren) {
  const [focusedMedia, setFocusedMedia] = useState<FocusedMedia | null>(null);
  const [focusedPerson, setFocusedPerson] = useState<FocusedPerson | null>(
    null,
  );

  return (
    <MediaDetailContext
      value={{
        focusedMedia,
        setFocusedMedia,
        focusedPerson,
        setFocusedPerson,
      }}
    >
      {children}
    </MediaDetailContext>
  );
}

export function useMediaDetail() {
  const context = use(MediaDetailContext);
  if (!context) {
    throw new Error("useMediaDetail must be used within a MediaDetailProvider");
  }
  return context;
}
