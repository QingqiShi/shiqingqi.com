"use client";

import { t } from "@tuja/i18n";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Sheet } from "@tuja/ui/components/sheet";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { createContext, use, useRef, useState, type ReactNode } from "react";
import { NewTripForm, type NewTripDraft } from "./new-trip-form.tsx";
import { NewTripFromText, type MadeTrip } from "./new-trip-from-text.tsx";

/** Opens the New trip sheet, which grows from `trigger` on a phone. */
type OpenNewTrip = (trigger: HTMLElement) => void;

const NewTripContext = createContext<OpenNewTrip | null>(null);

interface MadeTripNotice {
  /** The trip made from a plan, until its editor says what happened. */
  made: MadeTrip | null;
  clear: () => void;
}

const MadeTripContext = createContext<MadeTripNotice | null>(null);

/**
 * Holds the one New trip sheet of the app, above the frame, so that each
 * button that opens it can come and go, as the trip list does after the first
 * trip. It keeps what the person typed or pasted when the sheet closes, until
 * a trip is made. A trip made from a plan stays here until `NewTripNotice`
 * tells the person about it in the editor.
 */
export function NewTripProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<HTMLTextAreaElement>(null);
  const [way, setWay] = useState<"empty" | "text">("empty");
  const [draft, setDraft] = useState<NewTripDraft | null>(null);
  const [plan, setPlan] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [made, setMade] = useState<MadeTrip | null>(null);
  const close = () => {
    setIsOpen(false);
  };
  const leave = () => {
    // The page goes to the editor of the new trip. Thus the card must not
    // shrink back into the button on the page that goes.
    triggerRef.current = null;
    close();
  };

  return (
    <NewTripContext
      value={(trigger) => {
        triggerRef.current = trigger;
        setIsOpen(true);
      }}
    >
      <MadeTripContext
        value={{
          made,
          clear: () => {
            setMade(null);
          },
        }}
      >
        {children}
      </MadeTripContext>
      <Sheet
        isOpen={isOpen}
        onClose={close}
        // While the model reads the plan, only Cancel stops it.
        canClose={() => !isWorking}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({ en: "New trip", zh: "新建行程" })}
        initialFocusRef={way === "empty" ? titleRef : planRef}
        liftFrom={() => {
          const trigger = triggerRef.current;
          return trigger?.isConnected ? trigger : null;
        }}
      >
        <div css={stack.group}>
          <div inert={isWorking}>
            <SegmentedControl
              aria-label={t({
                en: "How to start the trip",
                zh: "行程的创建方式",
              })}
              fullWidth
              options={[
                {
                  value: "empty",
                  label: t({ en: "Start empty", zh: "空白行程" }),
                },
                {
                  value: "text",
                  label: t({ en: "From a plan", zh: "根据计划" }),
                },
              ]}
              value={way}
              onChange={setWay}
            />
          </div>
          {way === "empty" ? (
            <NewTripForm
              titleRef={titleRef}
              draft={draft}
              onDraftChange={setDraft}
              onCreated={() => {
                setDraft(null);
                leave();
              }}
            />
          ) : (
            <NewTripFromText
              textRef={planRef}
              text={plan}
              onTextChange={setPlan}
              onWorkingChange={setIsWorking}
              onMade={(next) => {
                setPlan("");
                setIsWorking(false);
                setMade(next);
                leave();
              }}
              onStartEmpty={() => {
                setWay("empty");
              }}
            />
          )}
        </div>
      </Sheet>
    </NewTripContext>
  );
}

export function useOpenNewTrip(): OpenNewTrip {
  const open = use(NewTripContext);
  if (open === null) throw new Error("useOpenNewTrip needs a NewTripProvider");
  return open;
}

/** The trip made from a plan whose notice has not shown, or null outside a `NewTripProvider`. */
export function useMadeTrip(): MadeTripNotice | null {
  return use(MadeTripContext);
}
