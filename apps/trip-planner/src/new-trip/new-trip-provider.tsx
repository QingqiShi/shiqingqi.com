"use client";

import { t } from "@tuja/i18n";
import { Sheet } from "@tuja/ui/components/sheet";
import { createContext, use, useRef, useState, type ReactNode } from "react";
import { NewTripForm, type NewTripDraft } from "./new-trip-form.tsx";

/** Opens the sheet of a blank trip, which grows from `trigger` on a phone. */
type OpenBlankTrip = (trigger: HTMLElement) => void;

const BlankTripContext = createContext<OpenBlankTrip | null>(null);

/**
 * Holds the one sheet of a blank trip, above the frame. It keeps what the
 * person typed when the sheet closes, until a trip is made.
 */
export function NewTripProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<NewTripDraft | null>(null);

  return (
    <BlankTripContext
      value={(trigger) => {
        triggerRef.current = trigger;
        setIsOpen(true);
      }}
    >
      {children}
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({ en: "Blank trip", zh: "空白行程" })}
        initialFocusRef={titleRef}
        liftFrom={() => {
          const trigger = triggerRef.current;
          return trigger?.isConnected ? trigger : null;
        }}
      >
        <NewTripForm
          titleRef={titleRef}
          draft={draft}
          onDraftChange={setDraft}
          onCreated={() => {
            setDraft(null);
            // The page goes to the new trip. Thus the card must not shrink
            // back into the link on the page that goes.
            triggerRef.current = null;
            setIsOpen(false);
          }}
        />
      </Sheet>
    </BlankTripContext>
  );
}

export function useOpenBlankTrip(): OpenBlankTrip {
  const open = use(BlankTripContext);
  if (open === null) {
    throw new Error("useOpenBlankTrip needs a NewTripProvider");
  }
  return open;
}
