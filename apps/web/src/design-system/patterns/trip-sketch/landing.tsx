"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/ssr/MapTrifold";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { border, shadow, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { itemRows, sketchTrip } from "./sketch-shared";

const FEATURES = [
  {
    icon: <MapTrifoldIcon weight="bold" />,
    title: "Every day, hour by hour",
    text: "Each stop, drive, booking and tip in the order you'll need them, with today opened for you.",
  },
  {
    icon: <CalendarDotsIcon weight="bold" />,
    title: "The whole trip at a glance",
    text: "A calendar of every day: where you'll be, how far you'll drive, and the weather.",
  },
  {
    icon: <SparkleIcon weight="bold" />,
    title: "Change it by asking",
    text: "Tell it what changed, such as a later flight or a closed restaurant, and the plan updates itself.",
  },
];

function TopBar() {
  return (
    <header css={[styles.column, styles.topBar]}>
      <div css={cluster.tight}>
        <SuitcaseRollingIcon weight="bold" />
        <Text look="label" weight="semibold">
          Trips
        </Text>
      </div>
      <div css={cluster.tight}>
        <Button look="ghost" size="sm" href="#sign-in">
          Sign in
        </Button>
        <Button look="primary" size="sm" href="#sign-up">
          Get started
        </Button>
      </div>
    </header>
  );
}

export function Shot({
  name,
  css,
}: {
  name: string;
  css?: stylex.StyleXStyles;
}) {
  return (
    <picture>
      <source
        srcSet={`/trip-sketch/${name}-dark.png`}
        media="(prefers-color-scheme: dark)"
      />
      <img
        src={`/trip-sketch/${name}-light.png`}
        alt="The day view of a trip"
        {...stylex.props(styles.shot, css)}
      />
    </picture>
  );
}

export function Features({ stacked = false }: { stacked?: boolean }) {
  return (
    <div css={stacked ? stack.item : styles.features}>
      {FEATURES.map((feature) => (
        <Card key={feature.title}>
          <Section
            title={feature.title}
            icon={feature.icon}
            level={3}
            look="heading"
          >
            <Text tone="muted">{feature.text}</Text>
          </Section>
        </Card>
      ))}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <div css={styles.page}>
      <TopBar />
      <main css={[styles.column, stack.section, styles.main]}>{children}</main>
      <footer css={[styles.column, styles.footer]}>
        <Text look="caption" tone="muted">
          trips.qingqi.dev · English · 中文
        </Text>
      </footer>
    </div>
  );
}

/** Landing 1: a centred promise, then the product itself, large. */
export function Landing1() {
  return (
    <Page>
      <section css={[stack.item, styles.centered]}>
        <Badge>Free while in beta</Badge>
        <h1 css={[typeRole.fluidDisplay, styles.balance]}>
          Your whole trip, one day at a time.
        </h1>
        <p css={[typeRole.fluidLead, styles.lead]}>
          Plan the days, keep every booking and tip beside the stop it belongs
          to, and open the app on the road to see exactly what's next.
        </p>
        <div css={cluster.tight}>
          <Button look="primary" href="#sign-up">
            Plan a trip
          </Button>
          <Button look="outline" href="#sign-in">
            Sign in
          </Button>
        </div>
      </section>
      <Shot name="trip-d-desktop" css={styles.heroShot} />
      <Features />
    </Page>
  );
}

/** Landing 2: the promise beside a live "today" card, built from the app's own parts. */
export function Landing2() {
  const day = sketchTrip.days[3];
  const next = day.moments[1];
  return (
    <Page>
      <section css={styles.split}>
        <div css={stack.item}>
          <Text look="overline" tone="muted">
            Trips · a travel planner
          </Text>
          <h1 css={[typeRole.fluidDisplay, styles.balance]}>
            Know what's next, wherever you are.
          </h1>
          <p css={[typeRole.fluidLead, styles.lead]}>
            A calm itinerary for road trips and long weekends. Today first, the
            whole trip one tap away.
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
        <div css={stack.item}>
          <Card>
            <div css={stack.item}>
              <div css={cluster.tight}>
                <Badge>Today</Badge>
                <Text look="caption" tone="muted">
                  Day 3 · next at 11:00
                </Text>
              </div>
              <Heading level={2} look="h3">
                {next.text}
              </Heading>
              <MetaLine facts={[day.weather?.temp, day.weather?.summary]} />
              <List form="plain">{itemRows(next.items)}</List>
            </div>
          </Card>
          <Callout intent="warning">
            Sunday at the beach: arrive before 11 for parking, and bring your
            own water and umbrella.
          </Callout>
          <List>
            <ListRow
              href="#d4"
              detail="Villa Vignacce → Pisa airport → Stansted"
            >
              Tomorrow · Return the car, fly home
            </ListRow>
          </List>
        </div>
      </section>
      <Section title="Made for the trip itself" look="heading" level={2}>
        <Features />
      </Section>
      <Shot name="trip-d-calendar-desktop" css={styles.heroShot} />
    </Page>
  );
}

/** Landing 3: AI first. The prompt is the hero; the plan it changes sits under it. */
export function Landing3() {
  return (
    <Page>
      <section css={[stack.item, styles.centered]}>
        <h1 css={[typeRole.fluidDisplay, styles.balance]}>
          Plans change. Just say so.
        </h1>
        <p css={[typeRole.fluidLead, styles.lead]}>
          Write a trip the way you'd text a friend. Trips turns it into a
          day-by-day plan, and keeps it right when things move.
        </p>
        <PromptField
          label="Ask Trips"
          size="lg"
          value="Our flight lands two hours late on Thursday. Move dinner in Cortona to 21:00."
          onValueChange={() => {}}
          onSubmit={() => {}}
          css={styles.prompt}
          action={
            <Button
              look="primary"
              size="sm"
              icon={<ArrowUpIcon weight="bold" />}
              aria-label="Send"
            />
          }
        />
        <div css={cluster.tight}>
          <Button look="primary" href="#sign-up">
            Try it with your trip
          </Button>
          <Button look="outline" href="#sign-in">
            Sign in
          </Button>
        </div>
      </section>
      <div css={styles.split}>
        <Shot name="trip-d-phone" css={styles.phoneShot} />
        <div css={stack.group}>
          <Heading level={2} look="h2">
            Then read it on the road.
          </Heading>
          <Features stacked />
        </div>
      </div>
    </Page>
  );
}

const styles = stylex.create({
  page: {
    minHeight: "100dvh",
    backgroundColor: color.background,
    color: color.foreground,
  },
  column: {
    width: "100%",
    maxWidth: "72rem",
    marginInline: "auto",
    paddingInline: space._5,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBlock: space._3,
  },
  main: { paddingBlock: space._8 },
  footer: { paddingBlock: space._7 },
  centered: { alignItems: "center", textAlign: "center" },
  balance: { textWrap: "balance", margin: 0 },
  lead: { margin: 0, maxWidth: "36rem", color: color.mutedForeground },
  heroShot: { width: "100%" },
  phoneShot: { width: "100%", maxWidth: "20rem", justifySelf: "center" },
  shot: {
    display: "block",
    borderRadius: border.radius_3,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: shadow._4,
  },
  features: {
    display: "grid",
    gap: space._3,
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
    },
  },
  split: {
    display: "grid",
    gap: space._8,
    alignItems: "center",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
  },
  prompt: { width: "100%", maxWidth: "40rem", textAlign: "start" },
});
