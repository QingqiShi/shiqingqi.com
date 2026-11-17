import { t } from "@tuja/i18n";
import type { ItemKind } from "#src/trips/ops/op-schema.ts";
import type { FormKind } from "./item-fields.ts";

/** The names of the kinds of item, as the rows and the sheet show them. */
export function useKindLabels(): Record<ItemKind, string> {
  return {
    dining: t({ en: "Meal", zh: "餐饮" }),
    place: t({ en: "Place", zh: "地点" }),
    lodging: t({ en: "Stay", zh: "住宿" }),
    tip: t({ en: "Tip", zh: "提示" }),
    flight: t({ en: "Flight", zh: "航班" }),
    nav: t({ en: "Directions", zh: "导航" }),
    checklist: t({ en: "Checklist", zh: "清单" }),
    signSheet: t({ en: "Road signs", zh: "路标" }),
  };
}

/** The label of each field of the form of a kind, by the key of the field. */
export function useFieldLabels(): Record<FormKind, Record<string, string>> {
  const name = t({ en: "Name", zh: "名称" });
  const note = t({ en: "Note", zh: "备注" });
  const query = t({ en: "Name to find it on the map", zh: "地图上搜索的名称" });
  const status = t({ en: "Status", zh: "状态" });
  return {
    dining: {
      name,
      description: note,
      status,
      "booking.date": t({ en: "Booking date", zh: "预订日期" }),
      "booking.time": t({ en: "Booking time", zh: "预订时间" }),
      "booking.party": t({ en: "Table for", zh: "人数" }),
      "booking.by": t({ en: "Booked by", zh: "预订人" }),
      "booking.contact": t({ en: "Booking contact", zh: "预订联系方式" }),
      "booking.note": t({ en: "Booking note", zh: "预订备注" }),
      area: t({ en: "Area", zh: "区域" }),
      tag: t({ en: "Kind of food", zh: "菜系" }),
      price: t({ en: "Price", zh: "价格" }),
      website: t({ en: "Website", zh: "官网" }),
      menu: t({ en: "Menu link", zh: "菜单链接" }),
      query,
    },
    place: {
      name,
      note,
      when: t({ en: "Best time to go", zh: "建议时间" }),
      tier: t({ en: "Priority", zh: "优先级" }),
      query,
    },
    lodging: {
      name,
      note,
      status,
      checkIn: t({ en: "Check-in", zh: "入住" }),
      checkOut: t({ en: "Check-out", zh: "退房" }),
      room: t({ en: "Room", zh: "房型" }),
      address: t({ en: "Address", zh: "地址" }),
      phone: t({ en: "Phone", zh: "电话" }),
      query,
    },
    tip: {
      text: t({ en: "Tip", zh: "提示" }),
      kind: t({ en: "About", zh: "类别" }),
    },
  };
}

/** The label of each value of the selects of the form. An empty value is "not set". */
export function useOptionLabels(): Record<string, string> {
  return {
    "": t({ en: "Not set", zh: "未设置" }),
    booked: t({ en: "Booked", zh: "已预订" }),
    pick: t({ en: "First choice", zh: "首选" }),
    option: t({ en: "Option", zh: "备选" }),
    pending: t({ en: "To confirm", zh: "待定" }),
    primary: t({ en: "First choice", zh: "首选" }),
    backup: t({ en: "Backup", zh: "备选" }),
    fallback: t({ en: "Fallback", zh: "兜底" }),
    info: t({ en: "Good to know", zh: "须知" }),
    warn: t({ en: "Warning", zh: "注意" }),
    parking: t({ en: "Parking", zh: "停车" }),
    fuel: t({ en: "Fuel", zh: "加油" }),
    drive: t({ en: "Driving", zh: "驾驶" }),
    transit: t({ en: "Public transport", zh: "公共交通" }),
    money: t({ en: "Money", zh: "费用" }),
  };
}
