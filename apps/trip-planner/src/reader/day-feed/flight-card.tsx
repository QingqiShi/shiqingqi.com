"use client";

import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { BroadcastIcon } from "@phosphor-icons/react/dist/ssr/Broadcast";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Card } from "@tuja/ui/components/card";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Stat } from "@tuja/ui/components/stat";
import { StatGroup } from "@tuja/ui/components/stat-group";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { ExternalButton } from "#src/reader/external-button.tsx";
import { TripText } from "#src/reader/trip-text.tsx";
import type { Flight, FlightEndpoint } from "#src/trips/types.ts";

/** The local time, a delay as the struck-out planned time, and the terminal. */
function EndpointDetail({ endpoint }: { endpoint: FlightEndpoint }) {
  const delayed =
    endpoint.scheduledTime !== undefined &&
    endpoint.scheduledTime !== endpoint.time;
  return (
    <MetaLine
      facts={[
        <TripText key="city">{endpoint.city}</TripText>,
        endpoint.time ? (
          <span key="time">
            {delayed ? <del>{endpoint.scheduledTime}</del> : null}
            {delayed ? " " : null}
            {endpoint.time}
            {endpoint.dayOffset ? (
              <sup>
                {endpoint.dayOffset > 0 ? "+" : ""}
                {endpoint.dayOffset}
              </sup>
            ) : null}
          </span>
        ) : null,
        endpoint.terminal ? (
          <TripText key="terminal">{endpoint.terminal}</TripText>
        ) : null,
      ].filter(Boolean)}
    />
  );
}

/** A flight: its number, where it leaves and lands with local times, and a
 *  link to follow it live. */
export function FlightCard({ flight }: { flight: Flight }) {
  return (
    <Card>
      <div css={stack.item}>
        <div css={cluster.tight}>
          <AirplaneTiltIcon weight="bold" aria-hidden />
          <Text as="span" weight="semibold">
            {flight.number}
          </Text>
          {flight.airline ? (
            <Text as="span" look="bodySmall" tone="muted">
              <TripText>{flight.airline}</TripText>
            </Text>
          ) : null}
          {flight.statusLabel ? (
            <Badge size="sm" intent="destructive">
              <TripText>{flight.statusLabel}</TripText>
            </Badge>
          ) : null}
          {flight.passenger ? (
            <Badge size="sm" intent="neutral">
              <TripText>{flight.passenger}</TripText>
            </Badge>
          ) : null}
        </div>
        <StatGroup look="plain">
          <Stat
            label={t({ en: "From", zh: "出发" })}
            value={flight.from.code}
            detail={<EndpointDetail endpoint={flight.from} />}
          />
          <Stat
            label={t({ en: "To", zh: "到达" })}
            value={flight.to.code}
            detail={<EndpointDetail endpoint={flight.to} />}
          />
        </StatGroup>
        {flight.note ? (
          <Text look="bodySmall" tone="muted">
            <TripText>{flight.note}</TripText>
          </Text>
        ) : null}
        {flight.track ? (
          <div>
            <ExternalButton
              href={flight.track}
              look="outline"
              icon={<BroadcastIcon weight="bold" />}
            >
              {t({ en: "Track live", zh: "实时追踪" })}
            </ExternalButton>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
