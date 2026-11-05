/**
 * Tuscany 2026 anniversary road trip — hard-coded, read-only content.
 *
 * Built from the trip notes (Tuscany.md). 5 days out of Pisa, all four nights
 * at Villa Vignacce (Bettolle, right by the A1 Valdichiana exit): the San
 * Gimignano–Siena day with the Arnolfo anniversary lunch, the classic
 * Val d'Orcia loop, and a coast day before flying home.
 */

import { tuscanyDay0 } from "./tuscany/tuscany-day-0";
import { tuscanyDays1To2 } from "./tuscany/tuscany-days-1-to-2";
import { tuscanyDays3To4 } from "./tuscany/tuscany-days-3-to-4";
import type { Day, PersonSchedule, Trip } from "./types";

const days: Day[] = [...tuscanyDay0, ...tuscanyDays1To2, ...tuscanyDays3To4];

/** 两个人全程同进同出：D0 一起飞抵，D4 一起飞回。 */
const partySchedule: PersonSchedule[] = [
  {
    id: "shitou",
    name: "石头",
    initial: "石",
    range: [0, 4],
    markers: { 0: "arrive", 4: "depart" },
  },
  {
    id: "tong",
    name: "Tong",
    initial: "T",
    range: [0, 4],
    markers: { 0: "arrive", 4: "depart" },
  },
];

export const tuscany: Trip = {
  slug: "tuscany",
  title: "托斯卡纳自驾",
  subtitle:
    "5 天自驾 · 中世纪山城 · Val d'Orcia 丝柏 · 第勒尼安海滩 · 纪念日之旅",
  dateRange: "2026 年 6 月 11 – 15 日",
  party: "2 人自驾",
  partySchedule,
  days,
};
