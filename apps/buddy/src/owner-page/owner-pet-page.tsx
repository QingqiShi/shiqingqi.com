"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect, useState } from "react";
import { todayOf } from "#src/pet/build-view.ts";
import { fillTemplate } from "#src/pet/fill-template.ts";
import { agoText } from "#src/pet/local-time.ts";
import type { OwnerPetState, PublicPetState, Range } from "#src/pet/types.ts";
import { usePetCopy } from "#src/pet/use-pet-copy.ts";
import { CareButtons } from "./care-buttons.tsx";
import { CornerButton, CornerLink } from "./corner-link.tsx";
import { firstRunStage } from "./first-run-stage.ts";
import { FirstRun } from "./first-run.tsx";
import { NamePlate } from "./name-plate.tsx";
import {
  OwnerSheet,
  ShareRows,
  usePageVisibility,
  VisibilitySwitch,
} from "./owner-sheet.tsx";
import { petPageColumn } from "./pet-page-column.stylex.ts";
import { PetSections } from "./pet-sections.tsx";
import { Scene } from "./scene.tsx";
import { useCareBatch } from "./use-care-batch.ts";
import { useFirstRunScene } from "./use-first-run-scene.ts";
import { REFRESH_MS, useLiveState } from "./use-live-state.ts";
import { usePetScene } from "./use-pet-scene.ts";
import { VisitorLinks } from "./visitor-links.tsx";

/** Who looks at the page: its owner, or anyone else, maybe signed in to an account of their own. */
type PetPageViewer =
  | { kind: "owner"; isPublic: boolean; connectedMacs: number }
  | { kind: "visitor"; ownName: string | null };

type OwnerPetPageProps = {
  initialState: PublicPetState;
  /** When the server rendered the page, so that hydration draws the same minute. */
  renderedAt: number;
  viewer: PetPageViewer;
};

/** While the owner waits for the first upload, the page looks more often, so the seed sprouts soon after it lands. */
const WAITING_REFRESH_MS = 10_000;
/** How long the party lasts when the first upload lands while the owner watches. */
const SPROUT_PARTY_MS = 8000;

/** Only the owner's read carries the Mac count, so only the owner sees the first run. */
function stageOf(state: PublicPetState | OwnerPetState) {
  return "connectedMacs" in state
    ? firstRunStage(state.connectedMacs, state.updatedAt)
    : null;
}

export function OwnerPetPage({
  initialState,
  renderedAt,
  viewer,
}: OwnerPetPageProps) {
  const copy = usePetCopy();
  const locale = useLocale();
  const initial: PublicPetState | OwnerPetState =
    viewer.kind === "owner"
      ? { ...initialState, connectedMacs: viewer.connectedMacs }
      : initialState;
  // The stage of the last render. The page looks more often while there is one, and the seed
  // sprouts when it ends.
  const [shownStage, setShownStage] = useState(() => stageOf(initial));
  const [isSprouting, setIsSprouting] = useState(false);
  const state = useLiveState(
    initial,
    viewer.kind === "owner"
      ? "/api/account/pet"
      : `/api/v1/u/${encodeURIComponent(initialState.user)}`,
    shownStage === null ? REFRESH_MS : WAITING_REFRESH_MS,
  );
  const stage = stageOf(state);

  if (stage !== shownStage) {
    setShownStage(stage);
    if (stage === null) setIsSprouting(true);
  }
  useEffect(() => {
    if (!isSprouting) return;
    const timer = setTimeout(() => {
      setIsSprouting(false);
    }, SPROUT_PARTY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isSprouting]);

  const [range, setRange] = useState<Range>("30");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const visibility = usePageVisibility(
    viewer.kind === "owner" && viewer.isPublic,
  );
  const careBatch = useCareBatch(state);
  const { view, now, scene, care } = usePetScene(
    careBatch.state,
    renderedAt,
    copy,
    range,
    useFirstRunScene(stage, isSprouting),
  );
  const today = todayOf(state, now);
  // Each drawing plays its entrance with the data it first showed, and draws still after that.
  const [intro] = useState({ state, today, range });
  const isFirstData = state === intro.state && today === intro.today;
  const isFirstRange = isFirstData && range === intro.range;

  const ago =
    state.updatedAt === null ? null : agoText(state.updatedAt, view.now, copy);
  const status =
    ago === null
      ? t({ en: "Not awake yet", zh: "还没醒过" })
      : view.isAway
        ? fillTemplate(
            t({
              en: "Asleep · last worked {ago}",
              zh: "睡着了 · 上次干活是 {ago}",
            }),
            { ago },
          )
        : fillTemplate(
            t({ en: "Awake · working {ago}", zh: "醒着 · {ago}还在干活" }),
            { ago },
          );

  return (
    <NavigationStack label={copy.petName} flush>
      <Scene {...scene}>
        <CornerLink side="start" href={getLocalePath("/", locale)} isWordmark>
          {t({ en: "Buddy", zh: "搭子" })}
        </CornerLink>
        {viewer.kind === "owner" ? (
          <CornerButton
            side="end"
            label={t({ en: "More", zh: "更多" })}
            onClick={() => {
              setIsSheetOpen(true);
            }}
          >
            <DotsThreeIcon weight="bold" aria-hidden />
          </CornerButton>
        ) : viewer.ownName === null ? (
          <CornerLink side="end" href={getLocalePath("/sign-in", locale)}>
            {t({ en: "Sign in", zh: "登录" })}
          </CornerLink>
        ) : null}
      </Scene>
      <div css={[pageColumn.base, petPageColumn.content]}>
        <div
          css={[
            stack.group,
            petPageColumn.column,
            stage !== null && petPageColumn.narrow,
          ]}
        >
          <NamePlate
            name={copy.petName}
            detail={
              stage === null
                ? { levelLabel: view.levelLabel, pips: view.pips, status }
                : null
            }
          />
          {stage === null ? (
            <CareButtons
              onCare={(kind) => {
                care(kind);
                careBatch.press(kind);
              }}
            />
          ) : null}
          {stage !== null ? (
            <FirstRun stage={stage} />
          ) : (
            <PetSections
              state={state}
              view={view}
              today={today}
              range={range}
              copy={copy}
              isFirstData={isFirstData}
              isFirstRange={isFirstRange}
              onRangeChange={setRange}
            />
          )}
          {viewer.kind === "visitor" ? (
            <VisitorLinks ownName={viewer.ownName} />
          ) : null}
        </div>
      </div>
      {viewer.kind === "owner" ? (
        <OwnerSheet
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
          }}
          settings={
            stage === null ? <VisibilitySwitch {...visibility} /> : null
          }
          rows={
            stage === null && "connectedMacs" in state ? (
              <ShareRows
                name={state.user}
                connectedMacs={state.connectedMacs}
              />
            ) : null
          }
        />
      ) : null}
    </NavigationStack>
  );
}
