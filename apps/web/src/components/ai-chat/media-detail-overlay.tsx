"use client";

import { t } from "#src/i18n.ts";
import { DetailOverlay } from "./detail-overlay";
import { MediaDetailContent } from "./media-detail-content";
import { useMediaDetail, type FocusedMedia } from "./media-detail-context";

function getDialogLabel(media: FocusedMedia): string {
  if (media.title) return media.title;
  if (media.mediaType === "movie")
    return t({ en: "Movie details", zh: "电影详情" });
  return t({ en: "TV show details", zh: "电视剧详情" });
}

export function MediaDetailOverlay() {
  const { focusedMedia, setFocusedMedia } = useMediaDetail();

  const handleClose = () => {
    setFocusedMedia(null);
  };

  return (
    <DetailOverlay
      isOpen={focusedMedia != null}
      onClose={handleClose}
      aria-label={focusedMedia ? getDialogLabel(focusedMedia) : ""}
    >
      {focusedMedia && (
        <MediaDetailContent
          id={focusedMedia.id}
          mediaType={focusedMedia.mediaType}
          title={focusedMedia.title}
          posterPath={focusedMedia.posterPath}
        />
      )}
    </DetailOverlay>
  );
}
