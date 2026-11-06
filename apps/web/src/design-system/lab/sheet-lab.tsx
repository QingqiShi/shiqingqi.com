"use client";

import { Button } from "@tuja/ui/components/button";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import sheetDoc from "#src/_generated/props/sheet.json";
import { defineLab, labSetter } from "./define-lab.tsx";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const CLOSE_LABEL = "Close";

const setIsOpen = labSetter<boolean>();

const contentSamples: LabSample[] = [
  {
    id: "archive",
    label: { en: "Short text", zh: "短文本" },
    value: labSource(
      <div css={stack.item}>
        <Text tone="muted">
          The list and its 12 items move to the archive. You can restore it from
          there at any time.
        </Text>
        <Button
          look="primary"
          onClick={() => {
            setIsOpen(false);
          }}
        >
          Archive
        </Button>
      </div>,
    ),
  },
  {
    id: "form",
    label: { en: "Form", zh: "表单" },
    value: labSource(
      <form
        css={stack.item}
        onSubmit={(event) => {
          event.preventDefault();
          setIsOpen(false);
        }}
      >
        <TextField label="Title" />
        <Textarea label="Note" />
        <Button type="submit" look="primary" size="lg">
          Save
        </Button>
      </form>,
    ),
  },
  {
    id: "long",
    label: { en: "Long", zh: "长内容" },
    value: labSource(
      <div css={stack.item}>
        <TextField label="Find" />
        {Array.from({ length: 16 }, (_, index) => (
          <Text key={index}>
            Content taller than the screen scrolls inside the card. Scrolled to
            its top, a pull down on it closes the sheet; anywhere else, a pull
            scrolls the text.
          </Text>
        ))}
      </div>,
    ),
  },
];

export const SheetLab = defineLab({
  doc: sheetDoc,
  component: Sheet,
  variants: [
    {
      id: "short",
      label: { en: "Short", zh: "短内容" },
      props: {
        isOpen: false,
        title: "Archive this list?",
        children: "archive",
        closeLabel: CLOSE_LABEL,
      },
    },
    {
      id: "form",
      label: { en: "Form", zh: "表单" },
      props: {
        isOpen: false,
        title: "Add a note",
        children: "form",
        closeLabel: CLOSE_LABEL,
      },
    },
    {
      id: "tall",
      label: { en: "Tall", zh: "长内容" },
      props: {
        isOpen: false,
        title: "A long read",
        children: "long",
        closeLabel: CLOSE_LABEL,
      },
    },
    {
      id: "untitled",
      label: { en: "No title", zh: "无标题" },
      props: {
        isOpen: false,
        "aria-label": "Archive this list?",
        children: "archive",
        closeLabel: CLOSE_LABEL,
      },
    },
  ],
  controls: [
    "title",
    { prop: "children", samples: contentSamples },
    "closeLabel",
  ],
  state: {
    prop: "isOpen",
    handler: "onClose",
    nextValue: false,
    setter: setIsOpen,
    trigger: labSource(
      <Button
        look="primary"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Open sheet
      </Button>,
    ),
  },
});
