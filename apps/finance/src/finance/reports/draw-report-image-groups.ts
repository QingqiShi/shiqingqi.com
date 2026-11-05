import { scaleLinear } from "d3-scale";
import { fillTemplate } from "./fill-template.ts";
import { groupChange } from "./group-moves.ts";
import {
  colors,
  fonts,
  lineAndArea,
  signColor,
  withOpacity,
  type ReportImageCanvas,
} from "./report-image-canvas.ts";
import {
  IMAGE_GROUP_GAP,
  IMAGE_GROUP_HEIGHT,
  IMAGE_GROUP_ROW_GAP,
  IMAGE_TITLE_HEIGHT,
} from "./report-image-layout.ts";
import type { ReportImageCopy } from "./use-report-image-copy.ts";
import type {
  ReportGroup,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/** A Group's line is never flatter than this share of its largest amount, so a small change does not look like a big one. */
const GROUP_LINE_MIN_RANGE = 0.08;
/** The top of a Group's line, under its name. */
const GROUP_LINE_TOP = 40;
const GROUP_TEXT_HALO = 10;

/** The text before and after `{name}` in a translated template. */
function splitTemplate(template: string, name: string) {
  const [before = "", after = ""] = template.split(`{${name}}`);
  return { before, after };
}

/** A Group with a tile: one with a balance or a change this week. */
export function shownGroups(data: WeeklyReportData) {
  const groups = (side: "assets" | "liabilities") =>
    data.balanceSheet[side].groups.map((group) => ({
      group,
      owed: side === "liabilities",
    }));
  return [...groups("assets"), ...groups("liabilities")].filter(
    ({ group }) => group.totalMinor !== 0 || groupChange(group) !== 0,
  );
}

export function drawReportImageGroups(
  { left, path, text, runs, sectionStart }: ReportImageCanvas,
  {
    groups,
    groupsTop,
    groupColumns,
    groupWidth,
    copy,
    money,
    change,
  }: {
    groups: ReturnType<typeof shownGroups>;
    groupsTop: number;
    groupColumns: number;
    groupWidth: number;
    copy: ReportImageCopy;
    money: (minor: number) => string;
    change: (minor: number) => string;
  },
) {
  /** A Group's line over the weeks of the trend, faint and filling its tile; a liability shows what it owes. */
  function groupLine(
    group: ReportGroup,
    isOwed: boolean,
    tileLeft: number,
    tileTop: number,
  ) {
    if (group.history.length < 2) return;
    const values = group.history.map((total) => (isOwed ? -total : total));
    const low = Math.min(...values);
    const high = Math.max(...values);
    const range = Math.max(
      high - low,
      Math.max(Math.abs(low), Math.abs(high)) * GROUP_LINE_MIN_RANGE,
    );
    if (range === 0) return;
    const middle = (low + high) / 2;
    const y = scaleLinear()
      .domain([middle - range / 2, middle + range / 2])
      .range([IMAGE_GROUP_HEIGHT - 6, GROUP_LINE_TOP]);
    const shape = lineAndArea(
      values.map((_value, index) => (index / (values.length - 1)) * groupWidth),
      values.map((value) => y(value)),
      IMAGE_GROUP_HEIGHT,
    );
    path(shape.area, tileLeft, tileTop, {
      fill: {
        y0: GROUP_LINE_TOP,
        y1: IMAGE_GROUP_HEIGHT,
        stops: [
          { offset: 0, color: withOpacity(colors.accent, 0.09) },
          { offset: 1, color: withOpacity(colors.accent, 0) },
        ],
      },
    });
    path(shape.line, tileLeft, tileTop, {
      stroke: {
        color: withOpacity(colors.accent, 0.28),
        width: 2.5,
        round: true,
      },
    });
  }

  sectionStart(copy.byGroup, groupsTop);
  const owed = splitTemplate(copy.owed, "amount");
  const weekChange = splitTemplate(copy.groupChange, "change");
  groups.forEach(({ group, owed: isOwed }, index) => {
    const column = index % groupColumns;
    const row = Math.floor(index / groupColumns);
    const tileLeft = left + column * (groupWidth + IMAGE_GROUP_GAP);
    const tileTop =
      groupsTop +
      IMAGE_TITLE_HEIGHT +
      row * (IMAGE_GROUP_HEIGHT + IMAGE_GROUP_ROW_GAP);
    groupLine(group, isOwed, tileLeft, tileTop);
    const halo = GROUP_TEXT_HALO;
    text(group.name, tileLeft, tileTop + 14, fonts.groupName, colors.muted, {
      maxWidth: groupWidth,
      halo,
    });
    const amount = {
      text: money(isOwed ? -group.totalMinor : group.totalMinor),
      font: fonts.amount,
      color: colors.ink,
    };
    runs(
      isOwed
        ? [
            { text: owed.before, font: fonts.body, color: colors.muted },
            amount,
            { text: owed.after, font: fonts.body, color: colors.muted },
          ]
        : [amount],
      tileLeft,
      tileTop + 63,
      { baseline: "alphabetic", halo },
    );
    const changeMinor = groupChange(group);
    const value = isOwed
      ? fillTemplate(changeMinor < 0 ? copy.owedMore : copy.owedLess, {
          amount: money(Math.abs(changeMinor)),
        })
      : change(changeMinor);
    runs(
      changeMinor === 0
        ? [{ text: copy.noChange, font: fonts.caption, color: colors.muted }]
        : [
            {
              text: weekChange.before,
              font: fonts.caption,
              color: colors.muted,
            },
            {
              text: value,
              font: fonts.captionStrong,
              color: signColor(changeMinor),
            },
            {
              text: weekChange.after,
              font: fonts.caption,
              color: colors.muted,
            },
          ],
      tileLeft,
      tileTop + 86,
      { halo },
    );
  });
}
