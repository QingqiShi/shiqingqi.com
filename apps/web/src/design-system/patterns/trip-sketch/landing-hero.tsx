"use client";

import type { Icon } from "@phosphor-icons/react";
import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CarProfileIcon } from "@phosphor-icons/react/dist/ssr/CarProfile";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
import { NavigationArrowIcon } from "@phosphor-icons/react/dist/ssr/NavigationArrow";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { Text } from "@tuja/ui/components/text";
import { useRingLight } from "@tuja/ui/hooks/use-ring-light";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { Features, Page, Shot } from "./landing";

interface PlanRow {
  label: string;
  detail?: string;
  icon: Icon;
  time: string;
  moved?: string;
}

const THURSDAY: PlanRow[] = [
  { label: "EZY8315 lands at Pisa", icon: AirplaneTiltIcon, time: "13:10", moved: "15:10" },
  { label: "Avis pick-up", detail: "Terminal car park", icon: CarProfileIcon, time: "13:40", moved: "15:40" },
  { label: "Drive to Cortona", detail: "1 h 50 min", icon: NavigationArrowIcon, time: "14:10", moved: "16:10" },
  { label: "Dinner in Cortona", detail: "La Bucaccia, table for 2", icon: ForkKnifeIcon, time: "19:30", moved: "21:00" },
  { label: "Villa Vignacce", detail: "4 nights", icon: BedIcon, time: "Night" },
];

const MOVED = THURSDAY.filter((row) => row.moved).length;

const PROMPT =
  "Our flight lands two hours late on Thursday. Move dinner in Cortona to 21:00.";

/** Sends once, then marks the plan as changed a moment later, as a reply would. */
function useSend() {
  const [sent, setSent] = useState(0);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    if (sent === 0) return;
    const timer = setTimeout(() => {
      setApplied(true);
    }, 700);
    return () => {
      clearTimeout(timer);
    };
  }, [sent]);
  return {
    sent,
    applied,
    send: () => {
      setApplied(false);
      setSent((count) => count + 1);
    },
    undo: () => {
      setApplied(false);
    },
  };
}

function Prompt({ onSend, size }: { onSend: () => void; size: "md" | "lg" }) {
  const [value, setValue] = useState(PROMPT);
  return (
    <PromptField
      label="Ask Trips"
      size={size}
      value={value}
      onValueChange={setValue}
      onSubmit={onSend}
      leading={<SparkleIcon weight="fill" />}
      action={
        <Button
          look="primary"
          size="sm"
          icon={<ArrowUpIcon weight="bold" />}
          aria-label="Send"
          onClick={onSend}
        />
      }
    />
  );
}

function Time({ row, applied }: { row: PlanRow; applied: boolean }) {
  if (!applied || row.moved === undefined) {
    return (
      <Text as="span" look="bodySmall" tone="muted" css={styles.tabular}>
        {row.time}
      </Text>
    );
  }
  return (
    <span css={styles.change}>
      <Text as="span" look="bodySmall" tone="muted" css={[styles.tabular, styles.struck]}>
        {row.time}
      </Text>
      <Text as="span" look="bodySmall" weight="semibold" css={[styles.tabular, styles.moved]}>
        {row.moved}
      </Text>
    </span>
  );
}

function PlanList({ applied }: { applied: boolean }) {
  return (
    <List form="plain">
      {THURSDAY.map((row) => {
        const RowIcon = row.icon;
        return (
          <ListRow
            key={row.label}
            leading={<RowIcon weight="bold" />}
            leadingShape="circle"
            detail={row.detail}
            value={<Time row={row} applied={applied} />}
          >
            {row.label}
          </ListRow>
        );
      })}
    </List>
  );
}

/** One lap of light round its box, when it mounts. */
function Ring() {
  const ring = useRingLight();
  return <div ref={ring} css={styles.ring} aria-hidden />;
}

/**
 * Option A. The prompt leads; under it sits the day it talks about. Send,
 * and the times in that day change in place, and one lap of light runs
 * round the day to show where the answer landed.
 */
export function LandingAnswer() {
  const { sent, applied, send } = useSend();
  return (
    <Page>
      <section css={[stack.group, styles.centred]}>
        <h1 css={[typeRole.fluidDisplay, styles.title]}>
          Plans change.
          <br />
          Just say so.
        </h1>
        <p css={[typeRole.fluidLead, styles.lead]}>
          Flights, bookings, tips from friends: write them down the way they
          come. Trips turns them into a day-by-day plan, and keeps it right
          when things move.
        </p>
        <div css={styles.column}>
          <Prompt size="lg" onSend={send} />
        </div>
        <div css={[styles.column, styles.ringHost]}>
          <Card>
            <div css={cluster.tight}>
              {applied ? <SparkleIcon weight="fill" {...stylex.props(styles.moved)} /> : null}
              <Text look="label" weight="semibold">
                {applied ? `Moved ${MOVED} things on Thursday` : "Thursday 11 June"}
              </Text>
              <Text look="caption" tone="muted">
                {applied ? "Thursday 11 June" : "Day 1"}
              </Text>
            </div>
            <PlanList applied={applied} />
          </Card>
          {applied ? <Ring key={sent} /> : null}
        </div>
        <div css={[cluster.tight, styles.ctas]}>
          <Button look="primary" href="#sign-up">
            Plan a trip
          </Button>
          <Button look="ghost" href="#sign-in">
            Sign in
          </Button>
        </div>
      </section>
      <Rest />
    </Page>
  );
}

/**
 * Option B. The words on one side, the app itself on the other: a day of
 * the trip with the prompt docked under it, as it is in the app. Send, and
 * Trips answers with what it would move. Keep it, and the day changes.
 */
export function LandingInApp() {
  const { sent, applied, send, undo } = useSend();
  const [kept, setKept] = useState(false);
  const proposing = applied && !kept;
  return (
    <Page>
      <section css={styles.split}>
        <div css={[stack.group, styles.splitText]}>
          <h1 css={[typeRole.fluidDisplay, styles.title]}>
            Plans change.
            <br />
            Just say so.
          </h1>
          <p css={[typeRole.fluidLead, styles.lead]}>
            Flights, bookings, tips from friends: write them down the way they
            come. Trips turns them into a day-by-day plan, and keeps it right
            when things move.
          </p>
          <div css={cluster.tight}>
            <Button look="primary" href="#sign-up">
              Plan a trip
            </Button>
            <Button look="ghost" href="#sign-in">
              Sign in
            </Button>
          </div>
        </div>
        <Card css={styles.app}>
          <div css={stack.tight}>
            <Text look="caption" tone="muted">
              Tuscany road trip · Day 1
            </Text>
            <Heading level={2} look="h3">
              Thursday 11 June
            </Heading>
          </div>
          <PlanList applied={applied} />
          {proposing ? (
            <div css={styles.ringHost}>
              <div css={[stack.tight, styles.reply]}>
                <div css={cluster.tight}>
                  <SparkleIcon weight="fill" {...stylex.props(styles.moved)} />
                  <Text look="label" weight="semibold">
                    Moved {MOVED} things on Thursday
                  </Text>
                </div>
                <Text look="bodySmall" tone="muted">
                  The car, the drive and dinner follow the flight. The villa
                  keeps your late check-in.
                </Text>
                <div css={cluster.tight}>
                  <Button
                    look="primary"
                    size="sm"
                    onClick={() => {
                      setKept(true);
                    }}
                  >
                    Keep
                  </Button>
                  <Button look="ghost" size="sm" onClick={undo}>
                    Undo
                  </Button>
                </div>
              </div>
              <Ring key={sent} />
            </div>
          ) : null}
          <Prompt
            size="md"
            onSend={() => {
              setKept(false);
              send();
            }}
          />
        </Card>
      </section>
      <Rest />
    </Page>
  );
}

function Rest() {
  return (
    <section css={styles.split}>
      <Shot name="trip-d-phone" css={styles.phoneShot} />
      <div css={stack.group}>
        <Heading level={2} look="h2">
          Then read it on the road.
        </Heading>
        <Features stacked />
      </div>
    </section>
  );
}

const WIDE = breakpoints.lg;

const styles = stylex.create({
  centred: {
    alignItems: "center",
    textAlign: "center",
    paddingBlock: { default: space._3, [WIDE]: space._8 },
  },
  column: { width: "100%", maxWidth: "36rem", textAlign: "start" },
  title: { margin: 0, textWrap: "balance" },
  lead: { margin: 0, maxWidth: "36rem", color: color.mutedForeground },
  ctas: { justifyContent: "center" },
  ringHost: { position: "relative" },
  ring: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    borderRadius: border.radius_3,
    color: color.infoText,
  },
  tabular: { fontVariantNumeric: "tabular-nums" },
  change: { display: "inline-flex", alignItems: "baseline", gap: space._1 },
  struck: { textDecoration: "line-through" },
  moved: { color: color.infoText },
  split: {
    display: "grid",
    gap: space._8,
    alignItems: "center",
    paddingBlock: { default: space._3, [WIDE]: space._8 },
    gridTemplateColumns: {
      default: "1fr",
      [WIDE]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
  },
  splitText: { alignItems: "flex-start" },
  app: { width: "100%", maxWidth: "30rem", justifySelf: "center" },
  reply: {
    padding: space._3,
    borderRadius: border.radius_3,
    backgroundColor: color.infoSubtle,
  },
  phoneShot: { width: "100%", maxWidth: "20rem", justifySelf: "center" },
});
