"use client";

import { t } from "#src/i18n.ts";
import { DetailOverlay } from "./detail-overlay";
import { useMediaDetail, type FocusedPerson } from "./media-detail-context";
import { PersonDetailContent } from "./person-detail-content";

function getDialogLabel(person: FocusedPerson): string {
  return person.name ?? t({ en: "Person details", zh: "人物详情" });
}

export function PersonDetailOverlay() {
  const { focusedPerson, setFocusedPerson } = useMediaDetail();

  const handleClose = () => setFocusedPerson(null);

  return (
    <DetailOverlay
      isOpen={focusedPerson != null}
      onClose={handleClose}
      aria-label={focusedPerson ? getDialogLabel(focusedPerson) : ""}
    >
      {focusedPerson && (
        <PersonDetailContent
          id={focusedPerson.id}
          name={focusedPerson.name}
          profilePath={focusedPerson.profilePath}
        />
      )}
    </DetailOverlay>
  );
}
