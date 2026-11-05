import type { Icon } from "@phosphor-icons/react";
import { AirplaneTiltIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTilt";
import { CookingPotIcon } from "@phosphor-icons/react/dist/ssr/CookingPot";
import { PlantIcon } from "@phosphor-icons/react/dist/ssr/Plant";
import { t } from "@tuja/i18n";

export interface DemoTask {
  id: string;
  title: string;
  due: string;
  note: string;
}

export interface DemoProject {
  id: string;
  name: string;
  icon: Icon;
  tasks: DemoTask[];
}

export function useDemoProjects(): DemoProject[] {
  return [
    {
      id: "garden",
      name: t({ en: "Garden", zh: "花园" }),
      icon: PlantIcon,
      tasks: [
        {
          id: "bulbs",
          title: t({ en: "Plant the tulip bulbs", zh: "种下郁金香球茎" }),
          due: t({ en: "Sat 25 Oct", zh: "10月25日 周六" }),
          note: t({
            en: "Two rows along the fence, a hand deep.",
            zh: "沿篱笆种两排，深约一掌。",
          }),
        },
        {
          id: "gate",
          title: t({ en: "Fix the gate latch", zh: "修好院门的门闩" }),
          due: t({ en: "Sun 26 Oct", zh: "10月26日 周日" }),
          note: t({
            en: "The screws are in the shed.",
            zh: "螺丝在棚屋里。",
          }),
        },
        {
          id: "compost",
          title: t({ en: "Order compost", zh: "订购堆肥" }),
          due: t({ en: "Mon 27 Oct", zh: "10月27日 周一" }),
          note: t({ en: "Six bags.", zh: "六袋。" }),
        },
      ],
    },
    {
      id: "kitchen",
      name: t({ en: "Kitchen", zh: "厨房" }),
      icon: CookingPotIcon,
      tasks: [
        {
          id: "tiles",
          title: t({ en: "Choose the tiles", zh: "选定瓷砖" }),
          due: t({ en: "Fri 31 Oct", zh: "10月31日 周五" }),
          note: t({
            en: "Bring the samples home first.",
            zh: "先把样品带回家看看。",
          }),
        },
        {
          id: "plumber",
          title: t({ en: "Book the plumber", zh: "预约水管工" }),
          due: t({ en: "Mon 3 Nov", zh: "11月3日 周一" }),
          note: t({
            en: "Ask about the old pipes too.",
            zh: "顺便问问旧水管的事。",
          }),
        },
      ],
    },
    {
      id: "trip",
      name: t({ en: "Trip to Lisbon", zh: "里斯本之行" }),
      icon: AirplaneTiltIcon,
      tasks: [
        {
          id: "passports",
          title: t({ en: "Renew the passports", zh: "续办护照" }),
          due: t({ en: "Wed 5 Nov", zh: "11月5日 周三" }),
          note: t({
            en: "Photos are in the top drawer.",
            zh: "照片在最上面的抽屉里。",
          }),
        },
        {
          id: "hotel",
          title: t({ en: "Book a hotel", zh: "预订酒店" }),
          due: t({ en: "Fri 7 Nov", zh: "11月7日 周五" }),
          note: t({
            en: "Near the river, with a lift.",
            zh: "靠近河边，要有电梯。",
          }),
        },
      ],
    },
  ];
}
