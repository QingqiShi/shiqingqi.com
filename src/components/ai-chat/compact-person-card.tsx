"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import type { PersonListItem } from "#src/utils/types.ts";
import { TmdbImage } from "../movie-database/tmdb-image";

interface CompactPersonCardProps {
  person: PersonListItem;
  onClick?: () => void;
}

function getPersonLabel(person: PersonListItem): string {
  return person.name ?? t({ en: "Person", zh: "人物" });
}

function ProfilePhoto({
  profilePath,
  alt,
}: {
  profilePath: string;
  alt: string;
}) {
  const { data: config } = useSuspenseQuery(tmdbQueries.configuration);

  if (!config.images?.base_url || !config.images.profile_sizes) {
    return <div css={[flex.center, styles.photoFallback]}>{alt.charAt(0)}</div>;
  }

  return (
    <TmdbImage
      baseUrl={config.images.secure_base_url ?? config.images.base_url}
      sizeConfig={config.images.profile_sizes}
      path={profilePath}
      alt={alt}
      sizes="80px"
      imgCss={styles.photo}
      skeletonCss={styles.photoSkeleton}
      errorFallback={
        <div css={[flex.center, styles.photoFallback]}>{alt.charAt(0)}</div>
      }
      loading="lazy"
    />
  );
}

export function CompactPersonCard({ person, onClick }: CompactPersonCardProps) {
  const label = getPersonLabel(person);

  const content = (
    <>
      <div css={styles.photoWrapper}>
        {person.profilePath ? (
          <ProfilePhoto profilePath={person.profilePath} alt={label} />
        ) : (
          <div css={[flex.center, styles.photoFallback]}>{label.charAt(0)}</div>
        )}
      </div>
      <span css={styles.name}>{label}</span>
      {person.knownForDepartment && (
        <span css={styles.department}>{person.knownForDepartment}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        css={[buttonReset.base, styles.card, styles.interactive]}
        onClick={onClick}
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return <div css={styles.card}>{content}</div>;
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._1,
    width: "100%",
    color: "inherit",
    textAlign: "center",
    borderRadius: border.radius_2,
    padding: space._1,
  },
  interactive: {
    transition: {
      default: "transform 0.15s ease, background-color 0.15s ease",
      [motionConstants.REDUCED_MOTION]: "background-color 0.15s ease",
    },
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
    },
    transform: {
      default: null,
      ":hover": "scale(1.03)",
      ":active": "scale(0.98)",
    },
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${color.controlActive}`,
    },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
  photoWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
    borderRadius: border.radius_round,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  photoSkeleton: {
    position: "absolute",
    inset: 0,
    borderRadius: border.radius_round,
  },
  photoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: color.backgroundRaised,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_round,
    fontSize: font.uiHeading1,
    color: color.textMuted,
  },
  name: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  department: {
    fontSize: "0.7rem",
    color: color.textMuted,
    lineHeight: 1.2,
  },
});
