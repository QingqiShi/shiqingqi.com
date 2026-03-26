"use client";

import { createContext, use, useState, type PropsWithChildren } from "react";

export interface FocusedMedia {
  id: number;
  mediaType: "movie" | "tv";
  title?: string | null;
  posterPath?: string | null;
}

interface MediaDetailState {
  focusedMedia: FocusedMedia | null;
  setFocusedMedia: (media: FocusedMedia | null) => void;
}

const MediaDetailContext = createContext<MediaDetailState | null>(null);

export function MediaDetailProvider({ children }: PropsWithChildren) {
  const [focusedMedia, setFocusedMedia] = useState<FocusedMedia | null>(null);

  return (
    <MediaDetailContext value={{ focusedMedia, setFocusedMedia }}>
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
