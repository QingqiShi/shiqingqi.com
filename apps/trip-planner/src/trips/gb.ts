/**
 * Great Britain 2026 road-trip itinerary — hard-coded, read-only content.
 *
 * Extracted from the trip plan. All copy is Chinese (the app is zh-only).
 * Locations carry a Google Maps search `query`; restaurants and lodgings add
 * websites/booking details where known.
 */

import { gbDays0To1 } from "./gb/gb-days-0-to-1";
import { gbDays10To11 } from "./gb/gb-days-10-to-11";
import { gbDays2To3 } from "./gb/gb-days-2-to-3";
import { gbDays4To5 } from "./gb/gb-days-4-to-5";
import { gbDays6To7 } from "./gb/gb-days-6-to-7";
import { gbDays8To9 } from "./gb/gb-days-8-to-9";
import type { Day, PersonSchedule, Trip } from "./types";

const days: Day[] = [
  ...gbDays0To1,
  ...gbDays2To3,
  ...gbDays4To5,
  ...gbDays6To7,
  ...gbDays8To9,
  ...gbDays10To11,
  {
    n: 12,
    date: "2026-06-30",
    dateLabel: "6月30日",
    weekday: "周二",
    title: "还车 · 返程回国",
    route: "Moxy → M25 → Gatwick 还车 → CA852 回国",
    driving: "约 1 小时",
    anchors: [
      {
        time: "07:45",
        label: "退房出发，Moxy → M25 → M23 南下",
        kind: "checkout",
        query: "Moxy London Excel",
      },
      {
        time: "08:30",
        label: "Pease Pottage 加满油（还车前最后便宜油站）",
        kind: "drive",
        query: "Pease Pottage Services M23",
        mode: "driving",
      },
      {
        time: "09:00",
        label: "Sixt 还车 · Gatwick South Terminal",
        kind: "dropoff",
        query: "Sixt Gatwick South Terminal",
        mode: "driving",
      },
      {
        time: "12:35",
        label: "CA852 起飞回国",
        kind: "flight",
      },
    ],
    nav: [
      {
        label: "Moxy → Pease Pottage 加满油",
        from: "Moxy London Excel",
        to: "Pease Pottage Services M23",
        mode: "driving",
        note: "⚠️ Sixt full-to-full，还车前最后加油点",
        time: "07:45",
      },
      {
        label: "Pease Pottage → Gatwick 还车",
        from: "Pease Pottage Services M23",
        to: "Sixt Gatwick South Terminal",
        mode: "driving",
        note: "距机场约 8–10min（J11 在机场以南），跟 Car Rental Return 标志",
        time: "08:45",
      },
    ],
    timeline: [
      { time: "07:00", text: "起床退房，行李上车" },
      { time: "07:45", text: "出发，Moxy → A2 → M25 → M23 南下" },
      {
        time: "08:30",
        text: "Pease Pottage Services（M23 J11）加满油——Sixt full-to-full，距机场约 8–10min（J11 在机场以南）",
      },
      {
        time: "08:45",
        text: "抵达 Gatwick South Terminal，跟着 Car Rental Return 标志走",
      },
      {
        time: "09:00",
        text: "Sixt 还车（外观 / 油量 / 里程检查，拍照留底，拿还车确认单）",
      },
      {
        time: "09:30",
        text: "转免费航站楼列车到 North Terminal 值机托运（国航 CA 柜台）+ 过安检",
      },
      { time: "12:35", text: "CA852 起飞，再见英国 🇬🇧 → 🇨🇳" },
    ],
    flights: [
      {
        number: "CA852",
        airline: "中国国际航空",
        passenger: "大雨",
        from: {
          code: "LGW",
          city: "伦敦 盖特威克",
          time: "12:35",
          terminal: "North",
        },
        to: {
          code: "PEK",
          city: "北京 首都",
          time: "04:52",
          terminal: "T3",
          dayOffset: 1,
        },
        track: "https://www.flightradar24.com/data/flights/ca852",
        note: "国航回北京，North Terminal 的 CA 柜台值机；次日凌晨 04:52 抵达首都 T3，点「实时追踪」看实时状态。",
        time: "12:35",
      },
    ],
    places: [],
    restaurants: [],
    checklists: [
      {
        title: "还车 Checklist",
        items: [
          "Pease Pottage 加满油，保留加油小票",
          "检查车内无个人物品（后备箱 / 杂物箱 / 座位下）",
          "拍照记录还车时车辆外观",
          "拿到还车确认单 / 邮件",
          "转 North Terminal，CA 国航柜台值机托运 + 过安检",
        ],
        time: "09:00",
      },
    ],
    tips: [
      {
        kind: "fuel",
        text: "必须在 Pease Pottage Services（M23 J11）加满油 — Sixt full-to-full，不加满按约 £2.5/升代加（正常 £1.5），距机场约 8–10min（J11 在机场以南）。",
        time: "08:30",
      },
      {
        kind: "info",
        text: "CA852 12:35 起飞，时间充裕；过安检后约 1.5h 可逛免税店。",
        time: "09:30",
      },
    ],
    stay: {
      summary: "夜宿 · 返程航班",
      lodging: [],
      note: "今晚在飞机上 · CA852 12:35 自 Gatwick 起飞回国。",
    },
  },
];

/**
 * Single source of truth for who is on the trip and when. 石头 is the UK-based
 * host; 大雨 and Jim are guests who fly in and out; Ed drives over for a weekend.
 *   大雨 — lands Day 0 (CA851), flies home Day 12 (CA852); around the whole trip.
 *   Jim  — lands Day 1 (CX255, Heathrow), flies home Day 8; leaves first.
 *   Ed   — drives over from Ipswich for the weekend, Day 2 (Sat) to Day 3 (Sun).
 *   石头 — heads home the night of Day 10, sits out the Day 11 solo day, then
 *          returns Day 12 to see 大雨 off at Gatwick.
 */
const partySchedule: PersonSchedule[] = [
  {
    id: "shitou",
    name: "石头",
    initial: "石",
    range: [0, 12],
    away: [11],
    markers: { 10: "home" },
  },
  {
    id: "dayu",
    name: "大雨",
    initial: "雨",
    range: [0, 12],
    markers: { 0: "arrive", 12: "depart" },
  },
  {
    id: "jim",
    name: "Jim",
    initial: "J",
    range: [1, 8],
    markers: { 1: "arrive", 8: "depart" },
  },
  {
    id: "ed",
    name: "Ed",
    initial: "E",
    range: [2, 3],
    via: "ground",
    markers: { 2: "arrive", 3: "depart" },
  },
];

export const gb: Trip = {
  slug: "gb",
  title: "大不列颠自驾",
  subtitle: "13 天深度自驾 · 英格兰 · 苏格兰高地 · 湖区 · 西南英格兰",
  dateRange: "2026 年 6 月 18 – 30 日",
  party: "3 人自驾",
  partySchedule,
  days,
};
