"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import sheetDoc from "#src/_generated/props/sheet.json";
import { LabCanvas } from "./lab-canvas.tsx";
import { labSetter } from "./lab-setter.ts";
import { labSource } from "./print-lab-value.ts";
import type { LabSample } from "./types.ts";

const setIsOpen = labSetter<boolean>();

export function SheetLab() {
  const closeLabel = t({ en: "Close", zh: "关闭" });
  const archiveTitle = t({ en: "Archive this list?", zh: "归档这个清单？" });
  // One short line: the snippet prints it inside the element, on one line.
  const longText = t({
    en: "Content taller than the screen scrolls inside the card.",
    zh: "高于屏幕的内容在卡片内部滚动。",
  });

  const contentSamples: LabSample[] = [
    {
      id: "archive",
      label: { en: "Short text", zh: "短文本" },
      value: labSource(
        <div css={stack.item}>
          <Text tone="muted">
            {t({
              en: "The list and its 12 items move to the archive. You can restore it from there at any time.",
              zh: "这个清单和其中的 12 项会移到归档中。你随时可以从那里恢复。",
            })}
          </Text>
          <Button
            look="primary"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            {t({ en: "Archive", zh: "归档" })}
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
          <TextField label={t({ en: "Title", zh: "标题" })} />
          <Textarea label={t({ en: "Note", zh: "备注" })} />
          <Button type="submit" look="primary" size="lg">
            {t({ en: "Save", zh: "保存" })}
          </Button>
        </form>,
      ),
    },
    {
      id: "long",
      label: { en: "Long", zh: "长内容" },
      value: labSource(
        <div css={stack.item}>
          <TextField label={t({ en: "Find", zh: "查找" })} />
          {Array.from({ length: 16 }, (_, index) => (
            <Text key={index}>{longText}</Text>
          ))}
        </div>,
      ),
    },
  ];

  return (
    <LabCanvas
      config={{
        doc: sheetDoc,
        component: Sheet,
        variants: [
          {
            id: "short",
            label: { en: "Short", zh: "短内容" },
            props: {
              isOpen: false,
              title: archiveTitle,
              children: "archive",
              closeLabel,
            },
          },
          {
            id: "form",
            label: { en: "Form", zh: "表单" },
            props: {
              isOpen: false,
              title: t({ en: "Add a note", zh: "添加备注" }),
              children: "form",
              closeLabel,
            },
          },
          {
            id: "tall",
            label: { en: "Tall", zh: "长内容" },
            props: {
              isOpen: false,
              title: t({ en: "A long read", zh: "一篇长文" }),
              children: "long",
              closeLabel,
            },
          },
          {
            id: "untitled",
            label: { en: "No title", zh: "无标题" },
            props: {
              isOpen: false,
              "aria-label": archiveTitle,
              children: "archive",
              closeLabel,
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
              {t({ en: "Open sheet", zh: "打开面板" })}
            </Button>,
          ),
        },
      }}
    />
  );
}
