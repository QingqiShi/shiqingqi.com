"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { layer } from "@tuja/ui/tokens.stylex";
import { createContext, use, useState, type ComponentProps } from "react";
import sheetDoc from "#src/_generated/props/sheet.json";
import { LabCanvas } from "./lab-canvas.tsx";
import type { LabConfig, LabSample } from "./types.ts";

type SheetLabProps = ComponentProps<typeof Sheet>;

const CLOSE_LABEL = "Close";

const READING_PARAGRAPHS = 16;

/** Lets the content close the sheet it is in, as a consumer's own state would. */
const CloseSheetContext = createContext<() => void>(() => undefined);

function ArchivePrompt() {
  const close = use(CloseSheetContext);
  return (
    <div css={stack.item}>
      <Text tone="muted">
        The list and its 12 items move to the archive. You can restore it from
        there at any time.
      </Text>
      <Button look="primary" onClick={close}>
        Archive
      </Button>
    </div>
  );
}

function NoteForm() {
  const close = use(CloseSheetContext);
  const [kind, setKind] = useState("note");
  return (
    <form
      css={stack.item}
      onSubmit={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <SegmentedControl
        aria-label="Kind"
        fullWidth
        value={kind}
        options={[
          { value: "note", label: "Note" },
          { value: "task", label: "Task" },
          { value: "idea", label: "Idea" },
        ]}
        onChange={setKind}
      />
      <TextField label="Title" />
      <Textarea label="Note" />
      <Button type="submit" look="primary" size="lg">
        Save
      </Button>
    </form>
  );
}

function LongRead() {
  const [textSize, setTextSize] = useState("medium");
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div css={stack.item}>
      <TextField label="Find" />
      {Array.from({ length: READING_PARAGRAPHS }, (_, index) => (
        <Text key={index}>
          Content taller than the screen scrolls inside the card. Scrolled to
          its top, a pull down on it closes the sheet; anywhere else, a pull
          scrolls the text.
        </Text>
      ))}
      <div ref={ref} css={[styles.stickyBar, css]}>
        <EffectCarrier value={sticky}>
          <SegmentedControl
            aria-label="Text size"
            fullWidth
            value={textSize}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
            onChange={setTextSize}
          />
        </EffectCarrier>
      </div>
    </div>
  );
}

const contentSamples: LabSample[] = [
  {
    id: "archive",
    label: { en: "Short text", zh: "短文本" },
    code: "<ArchivePrompt />",
    imports: [],
    value: <ArchivePrompt />,
  },
  {
    id: "form",
    label: { en: "Form", zh: "表单" },
    code: "<NoteForm />",
    imports: [],
    value: <NoteForm />,
  },
  {
    id: "long",
    label: { en: "Long, with a sticky bar", zh: "长内容与吸底栏" },
    code: "<LongRead />",
    imports: [],
    value: <LongRead />,
  },
];

/**
 * A Sheet is modal, so the Canvas holds the button that opens it. The button
 * owns `isOpen`, as a consumer would, and the Lab's props go to the Sheet.
 */
function OperableSheet(props: SheetLabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    setIsOpen(false);
  };
  return (
    <>
      <Button
        look="primary"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Open sheet
      </Button>
      <CloseSheetContext value={close}>
        <Sheet {...props} isOpen={isOpen} onClose={close} />
      </CloseSheetContext>
    </>
  );
}

const config: LabConfig<SheetLabProps> = {
  component: "sheet",
  element: "Sheet",
  importPath: "@tuja/ui/components/sheet",
  propsDoc: sheetDoc,
  render: (props) => <OperableSheet {...props} />,
  variants: [
    {
      id: "short",
      label: { en: "Short", zh: "短内容" },
      props: {
        title: "Archive this list?",
        children: "archive",
        closeLabel: CLOSE_LABEL,
      },
    },
    {
      id: "form",
      label: { en: "Form", zh: "表单" },
      props: {
        title: "Add a note",
        children: "form",
        closeLabel: CLOSE_LABEL,
      },
    },
    {
      id: "tall",
      label: { en: "Tall", zh: "长内容" },
      props: {
        title: "A long read",
        children: "long",
        closeLabel: CLOSE_LABEL,
      },
    },
    {
      id: "untitled",
      label: { en: "No title", zh: "无标题" },
      props: {
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
};

/** The Sheet Lab: a button on the Canvas that opens the Sheet, with its API beside it. */
export function SheetLab() {
  return <LabCanvas config={config} />;
}

const styles = stylex.create({
  stickyBar: {
    position: "sticky",
    insetBlockEnd: 0,
    zIndex: layer.raised,
  },
});
