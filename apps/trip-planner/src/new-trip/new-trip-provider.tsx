"use client";

import { t } from "@tuja/i18n";
import { Sheet } from "@tuja/ui/components/sheet";
import { createContext, use, useRef, useState, type ReactNode } from "react";
import { NewTripForm } from "./new-trip-form.tsx";

/** Opens the New trip sheet, which grows from `trigger` on a phone. */
type OpenNewTrip = (trigger: HTMLElement) => void;

const NewTripContext = createContext<OpenNewTrip | null>(null);

/**
 * Holds the one New trip sheet of the app, above the frame, so that each
 * button that opens it can come and go, as the trip list does after the first
 * trip.
 */
export function NewTripProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const close = () => {
    setIsOpen(false);
  };

  return (
    <NewTripContext
      value={(trigger) => {
        triggerRef.current = trigger;
        setIsOpen(true);
      }}
    >
      {children}
      <Sheet
        isOpen={isOpen}
        onClose={close}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({ en: "New trip", zh: "新建行程" })}
        initialFocusRef={titleRef}
        liftFrom={() => {
          const trigger = triggerRef.current;
          return trigger?.isConnected ? trigger : null;
        }}
      >
        <NewTripForm
          titleRef={titleRef}
          onCreated={() => {
            // The page goes to the editor of the new trip. Thus the card
            // must not shrink back into the button on the page that goes.
            triggerRef.current = null;
            close();
          }}
        />
      </Sheet>
    </NewTripContext>
  );
}

export function useOpenNewTrip(): OpenNewTrip {
  const open = use(NewTripContext);
  if (open === null) throw new Error("useOpenNewTrip needs a NewTripProvider");
  return open;
}
