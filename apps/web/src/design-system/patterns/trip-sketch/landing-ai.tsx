"use client";

import type { Icon } from "@phosphor-icons/react";
import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CarProfileIcon } from "@phosphor-icons/react/dist/ssr/CarProfile";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr/ForkKnife";
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
import { useDust } from "@tuja/ui/hooks/use-dust";
import { useExtractorFan } from "@tuja/ui/hooks/use-extractor-fan";
import { useRingLight } from "@tuja/ui/hooks/use-ring-light";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { Features, Page, Shot } from "./landing";

interface Fragment {
  text: string;
  changed?: string;
  icon: Icon;
}

const FRAGMENTS: Fragment[] = [
  {
    text: "13:10 · Land at Pisa",
    changed: "15:10 · Land at Pisa",
    icon: AirplaneTiltIcon,
  },
  {
    text: "13:40 · Avis pick-up",
    changed: "15:40 · Avis pick-up",
    icon: CarProfileIcon,
  },
  {
    text: "19:30 · Dinner in Cortona",
    changed: "21:00 · Dinner in Cortona",
    icon: ForkKnifeIcon,
  },
  { text: "Night · Villa Vignacce", icon: BedIcon },
];

const PROMPT =
  "Our flight lands two hours late on Thursday. Move dinner in Cortona to 21:00.";

/**
 * A loose piece of a plan. It stays still. When a request changes it, it
 * sheds a little dust into the prompt, and then shows its new value.
 */
function PlanFragment({
  fragment,
  sent,
  applied,
}: {
  fragment: Fragment;
  sent: number;
  applied: boolean;
}) {
  const changes = fragment.changed !== undefined;
  const dust = useDust({
    density: 0,
    burst: 14,
    drift: true,
    shakes: changes ? sent : 0,
  });
  const FragmentIcon = fragment.icon;
  const isChanged = changes && applied;
  return (
    <span
      ref={dust}
      css={[
        styles.fragment,
        isChanged && styles.fragmentChanged,
      ]}
    >
      <FragmentIcon weight="bold" {...stylex.props(styles.fragmentIcon)} />
      {isChanged ? fragment.changed : fragment.text}
    </span>
  );
}

/** One lap of light round the prompt, each time a request is sent. */
function SentRing() {
  const ring = useRingLight();
  return <div ref={ring} css={styles.ring} aria-hidden />;
}

function Prompt({ sent, onSend }: { sent: number; onSend: () => void }) {
  const fan = useExtractorFan({ reach: 900 });
  const [value, setValue] = useState(PROMPT);
  return (
    <div ref={fan} css={styles.promptFan}>
      <PromptField
        label="Ask Trips"
        size="lg"
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
      {sent > 0 ? <SentRing key={sent} /> : null}
    </div>
  );
}

function ChangeCard() {
  return (
    <Card css={styles.changeCard}>
      <div css={stack.item}>
        <div css={cluster.tight}>
          <SparkleIcon weight="fill" />
          <Text look="label" weight="semibold">
            Trips changed 3 things on Thursday
          </Text>
        </div>
        <List form="plain">
          <ListRow
            href="#flight"
            leading={<AirplaneTiltIcon weight="bold" />}
            leadingShape="circle"
            value={<Change from="13:10" to="15:10" />}
          >
            EZY8315 lands
          </ListRow>
          <ListRow
            href="#car"
            leading={<CarProfileIcon weight="bold" />}
            leadingShape="circle"
            value={<Change from="13:40" to="15:40" />}
          >
            Avis pick-up
          </ListRow>
          <ListRow
            href="#dinner"
            leading={<ForkKnifeIcon weight="bold" />}
            leadingShape="circle"
            value={<Change from="19:30" to="21:00" />}
          >
            Dinner in Cortona
          </ListRow>
        </List>
      </div>
    </Card>
  );
}

function Change({ from, to }: { from: string; to: string }) {
  return (
    <span css={styles.change}>
      <Text as="span" look="bodySmall" tone="muted" css={styles.struck}>
        {from}
      </Text>
      <ArrowRightIcon weight="bold" />
      <Text as="span" look="bodySmall" weight="semibold">
        {to}
      </Text>
    </span>
  );
}

/** Landing 3: the loose pieces of a plan drift into one prompt. */
export function LandingAi() {
  const [sent, setSent] = useState(0);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    if (sent === 0) return;
    const timer = setTimeout(() => {
      setApplied(true);
    }, 900);
    return () => {
      clearTimeout(timer);
    };
  }, [sent]);
  return (
    <Page>
      <section css={styles.hero}>
        <div css={[stack.group, styles.heroText]}>
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
          <Prompt
            sent={sent}
            onSend={() => {
              setSent((count) => count + 1);
            }}
          />
          <div css={[stack.tight, styles.plan]}>
            <Text look="caption" tone="muted">
              Thursday 11 June · Day 1
            </Text>
            <div css={[cluster.tight, styles.ctas]}>
              {FRAGMENTS.map((fragment) => (
                <PlanFragment
                  key={fragment.text}
                  fragment={fragment}
                  sent={sent}
                  applied={applied}
                />
              ))}
            </div>
          </div>
          <div css={[cluster.tight, styles.ctas]}>
            <Button look="primary" href="#sign-up">
              Plan a trip
            </Button>
            <Button look="ghost" href="#sign-in">
              Sign in
            </Button>
          </div>
        </div>
      </section>
      <section css={styles.split}>
        <ChangeCard />
        <div css={stack.item}>
          <Heading level={2} look="h2">
            One sentence, every knock-on.
          </Heading>
          <Text tone="muted">
            A late flight moves the car, the drive and the dinner. Trips shows
            what it changed before you keep it.
          </Text>
        </div>
      </section>
      <section css={styles.split}>
        <Shot name="trip-d-phone" css={styles.phoneShot} />
        <div css={stack.group}>
          <Heading level={2} look="h2">
            Then read it on the road.
          </Heading>
          <Features stacked />
        </div>
      </section>
    </Page>
  );
}

const WIDE = breakpoints.lg;


const styles = stylex.create({
  hero: {
    position: "relative",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space._2,
    paddingBlock: { default: space._3, [WIDE]: space._9 },
  },
  heroText: {
    alignItems: "center",
    textAlign: "center",
    width: "100%",
    maxWidth: "44rem",
    order: { default: 1, [WIDE]: 0 },
    marginBlockStart: { default: space._7, [WIDE]: 0 },
  },
  plan: { alignItems: "center" },
  title: { margin: 0, textWrap: "balance" },
  lead: { margin: 0, maxWidth: "36rem", color: color.mutedForeground },
  ctas: { justifyContent: "center" },
  fragment: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    height: { default: "2rem", [WIDE]: "2.25rem" },
    paddingInline: space._3,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.card,
    color: color.mutedForeground,
    transitionProperty: "background-color, color, border-color",
    transitionDuration: "300ms",
    fontSize: { default: ".8125rem", [WIDE]: ".875rem" },
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  fragmentChanged: {
    backgroundColor: color.infoSubtle,
    borderColor: "transparent",
    color: color.infoText,
  },
  fragmentIcon: { flexShrink: 0, width: "1rem", height: "1rem" },
  promptFan: {
    position: "relative",
    width: "100%",
    maxWidth: "40rem",
    textAlign: "start",
  },
  ring: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    borderRadius: border.radius_3,
    color: color.foreground,
  },
  changeCard: { width: "100%", maxWidth: "28rem", justifySelf: "center" },
  change: { display: "inline-flex", alignItems: "center", gap: space._1 },
  struck: { textDecoration: "line-through" },
  split: {
    display: "grid",
    gap: space._8,
    alignItems: "center",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
  },
  phoneShot: { width: "100%", maxWidth: "20rem", justifySelf: "center" },
});
