"use client";

import { Card } from "@/components/shared/card";
import { useTranslations } from "@/hooks/use-translations";
import { getLocalePath } from "@/utils/pathname";
import { useTranslationContext } from "@/utils/translation-context";
import type { MediaListItem } from "@/utils/types";
import { PosterImage } from "./poster-image";
import type translations from "./poster-image.translations.json";

interface MediaCardProps {
  media: MediaListItem;
  allowFollow?: boolean;
}

export function MediaCard({ media, allowFollow }: MediaCardProps) {
  const { t } = useTranslations<typeof translations>("posterImage");
  const { locale } = useTranslationContext();
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const href = getLocalePath(
    `/movie-database/${media.mediaType}/${media.id.toString()}`,
    locale,
  );

  return (
    <Card
      href={href}
      className="aspect-[2/3] w-full"
      aria-label={media.title ?? undefined}
      rel={allowFollow ? undefined : "nofollow"}
    >
      <div className="absolute top-0 left-0 right-0 bottom-0 z-base">
        {media.posterPath && media.title ? (
          <PosterImage posterPath={media.posterPath} alt={media.title} />
        ) : (
          <div className="w-full h-full object-cover absolute flex flex-col items-center justify-center text-center surface-raised z-background">
            <div>{media.title}</div>
            <div className="text-sm text-gray-11 dark:text-grayDark-11">
              {t("failedToLoadImage")}
            </div>
          </div>
        )}
        {media.rating ? (
          <div className="absolute top-1 left-1 w-6 h-6 rounded-full surface-raised border-[.2em] border-gray-12 dark:border-grayDark-12 text-sm flex items-center justify-center">
            {formatter.format(media.rating)}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
