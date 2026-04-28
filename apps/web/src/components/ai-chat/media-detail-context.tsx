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

type FocusedDetail =
  | { kind: "media"; media: FocusedMedia }
  | { kind: "person"; person: FocusedPerson };

interface MediaDetailState {
  focusedMedia: FocusedMedia | null;
  focusedPerson: FocusedPerson | null;
  setFocusedMedia: (media: FocusedMedia | null) => void;
  setFocusedPerson: (person: FocusedPerson | null) => void;
}

const MediaDetailContext = createContext<MediaDetailState | null>(null);

export function MediaDetailProvider({ children }: PropsWithChildren) {
  const [focusedDetail, setFocusedDetail] = useState<FocusedDetail | null>(
    null,
  );

  const setFocusedMedia = (media: FocusedMedia | null) => {
    setFocusedDetail(media ? { kind: "media", media } : null);
  };

  const setFocusedPerson = (person: FocusedPerson | null) => {
    setFocusedDetail(person ? { kind: "person", person } : null);
  };

  const focusedMedia =
    focusedDetail?.kind === "media" ? focusedDetail.media : null;
  const focusedPerson =
    focusedDetail?.kind === "person" ? focusedDetail.person : null;

  return (
    <MediaDetailContext
      value={{
        focusedMedia,
        focusedPerson,
        setFocusedMedia,
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
