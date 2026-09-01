"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseQuery } from "@tanstack/react-query";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import type { PersonListItem } from "#src/utils/person-list-item.ts";
import { configurationQuery } from "#src/utils/tmdb-queries/configuration-query.ts";
import { TmdbImage } from "../movie-database/tmdb-image";
import { DepartmentLabel } from "./department-label";

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
  fallbackInitial,
}: {
  profilePath: string;
  alt: string;
  fallbackInitial: string;
}) {
  const { data: config } = useSuspenseQuery(configurationQuery);

  if (!config.images?.base_url || !config.images.profile_sizes) {
    return (
      <div css={[flex.center, corner.radius_round, styles.photoFallback]}>
        {fallbackInitial}
      </div>
    );
  }

  return (
    <TmdbImage
      baseUrl={config.images.secure_base_url ?? config.images.base_url}
      sizeConfig={config.images.profile_sizes}
      path={profilePath}
      alt={alt}
      sizes="80px"
      imgCss={styles.photo}
      skeletonCss={[corner.radius_round, styles.photoSkeleton]}
      errorFallback={
        <div css={[flex.center, corner.radius_round, styles.photoFallback]}>
          {fallbackInitial}
        </div>
      }
      loading="lazy"
    />
  );
}

export function CompactPersonCard({ person, onClick }: CompactPersonCardProps) {
  const label = getPersonLabel(person);
  // When wrapped in the labelled button below, the name is already announced
  // via both the button's `aria-label` and the visible `<span>` below the
  // photo, so the photo's `alt` is decorative. In the non-interactive `<div>`
  // branch the image alt is the only name, so keep the label.
  const photoAlt = onClick ? "" : label;

  const content = (
    <>
      <div css={[corner.radius_round, styles.photoWrapper]}>
        {person.profilePath ? (
          <ProfilePhoto
            profilePath={person.profilePath}
            alt={photoAlt}
            fallbackInitial={label.charAt(0)}
          />
        ) : (
          <div css={[flex.center, corner.radius_round, styles.photoFallback]}>
            {label.charAt(0)}
          </div>
        )}
      </div>
      <span css={styles.name}>{label}</span>
      {person.knownForDepartment && (
        <span css={styles.department}>
          <DepartmentLabel department={person.knownForDepartment} />
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        css={[
          buttonReset.base,
          corner.radius_2,
          styles.card,
          styles.interactive,
          a11y.focusRing,
        ]}
        onClick={onClick}
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return <div css={[corner.radius_2, styles.card]}>{content}</div>;
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
    padding: space._1,
  },
  interactive: {
    transition: {
      default: "transform 0.15s ease, background-color 0.15s ease",
      [motionConstants.REDUCED_MOTION]: "background-color 0.15s ease",
    },
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
    },
    transform: {
      default: null,
      ":hover": "scale(1.03)",
      ":active": "scale(0.98)",
    },
  },
  photoWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
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
  },
  photoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: color.bgSurface,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
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
