"use client";

import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Fragment } from "react";
import type { DecisionNote } from "../views/load-desk.ts";
import { MarkdownText } from "./markdown-text.tsx";

function NoteSummary({ note }: { note: DecisionNote }) {
  return (
    <span css={stack.text}>
      {note.symbol === null ? null : (
        <Text as="span" look="body" weight="semibold">
          {note.symbol}
          {note.name === null ? null : (
            <Text as="span" look="caption" tone="muted">
              {`  ${note.name}`}
            </Text>
          )}
        </Text>
      )}
      <Text as="span" look="bodySmall" tone="muted" verbatim>
        {note.summary}
      </Text>
    </span>
  );
}

/** A card of decisions that place no order, such as holds: each a line, with its reasoning one tap away. */
export function DecisionNoteList({
  title,
  description,
  notes,
}: {
  title: string;
  description?: string;
  notes: readonly DecisionNote[];
}) {
  return (
    <Card>
      <div css={stack.item}>
        <CardHeader>
          <CardTitle level={3}>{title}</CardTitle>
          {description === undefined ? null : (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <div css={stack.tight}>
          {notes.map((note, index) => (
            <Fragment key={note.id}>
              {index > 0 ? <Divider /> : null}
              <Disclosure summary={<NoteSummary note={note} />}>
                <MarkdownText>{note.rationale}</MarkdownText>
              </Disclosure>
            </Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
}
