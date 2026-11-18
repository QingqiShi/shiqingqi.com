import "server-only";
import { changes } from "#src/assistant/store/changes.ts";
import { messages } from "#src/assistant/store/messages.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { dayNumber } from "#src/trips/day-number.ts";
import { withExpect } from "#src/trips/ops/apply-ops.ts";
import { invertOps } from "#src/trips/ops/invert-ops.ts";
import { retrySaves, writeTrips } from "#src/trips/write-trips.ts";
import type { ChangeOutcome } from "../change-service.ts";
import { segmentMessages } from "../segment-messages.ts";
import { tripView } from "../trip-view.ts";
import { researchCards, type CardAction } from "./research-cards.ts";
import { cleanItem, shownCards } from "./research-list.ts";

class Abort extends Error {
  readonly outcome: ChangeOutcome;
  constructor(outcome: ChangeOutcome) {
    super(outcome.status);
    this.outcome = outcome;
  }
}

/**
 * The person tapped "Add to day N" or "Save as backup" on a research card.
 * The server builds the ops from the card that it stored, never from the
 * request, and saves them as the person: a direct change with Undo, also
 * after a turn that only proposes, because the person decided. Each action
 * of a card takes effect once; after an Undo it can be done again.
 */
async function act(
  db: TripsDb,
  userId: string,
  input: {
    changeId: string;
    itemId: string;
    action: CardAction;
    dayId: string;
  },
): Promise<ChangeOutcome> {
  try {
    return await retrySaves(() =>
      asViewer(db, userId, async (tx) => {
        const stored = await changes.get(tx, input.changeId);
        if (!stored?.tripId || stored.kind !== "research") {
          return { status: "not_allowed" };
        }
        const parsed = shownCards.safeParse(stored.card);
        const shown = parsed.success
          ? parsed.data.cards.find((each) => each.id === input.itemId)
          : undefined;
        const card = shown && cleanItem(shown);
        if (!card) return { status: "not_allowed" };
        const trip = await tripView.read(tx, stored.tripId);
        const dayIndex =
          trip?.days.findIndex((day) => day.id === input.dayId) ?? -1;
        if (!trip || dayIndex === -1) return { status: "not_allowed" };

        const prefix = `${card.id}:${input.action}:`;
        const earlier = (await changes.list(tx, stored.conversationId)).filter(
          (row) =>
            row.parentId === stored.id && row.actionKey?.startsWith(prefix),
        );
        if (earlier.some((row) => row.status !== "undone")) {
          return { status: "not_allowed" };
        }

        const ops = researchCards.cardOps(card, input.action, input.dayId);
        const sent = withExpect(trip, ops);
        const result = await writeTrips.changeIn(tx, stored.tripId, sent);
        if (result.status === "conflict")
          throw new Abort({ status: "conflict" });
        if (result.status !== "applied") {
          throw new Abort({ status: "not_allowed" });
        }
        const day = String(dayNumber(trip, dayIndex));
        const summary =
          input.action === "add"
            ? `Add ${card.name} to day ${day}`
            : `Save ${card.name} as a backup on day ${day}`;
        const inverse = invertOps(result.before, ops);
        const changeId = await changes.record(tx, stored.conversationId, {
          kind: "applied",
          status: "applied",
          ops: sent,
          inverseOps:
            inverse.length > 0 ? withExpect(result.trip, inverse) : null,
          revision: result.revision,
          card: { summary, dayIds: [input.dayId] },
          parentId: stored.id,
          actionKey: `${prefix}${String(earlier.length)}`,
        });
        if (!changeId) throw new Abort({ status: "not_allowed" });
        const version = tripView.version(result.trip);
        const added = await messages.append(tx, stored.conversationId, null, [
          segmentMessages.eventEntry({
            type: "card",
            changeId,
            action: input.action,
            text: researchCards.eventText(card, input.action, day, version),
          }),
        ]);
        if (added === null) throw new Abort({ status: "busy" });
        return { status: "done", version };
      }),
    );
  } catch (error) {
    if (error instanceof Abort) return error.outcome;
    throw error;
  }
}

export const cardActions = { act };
