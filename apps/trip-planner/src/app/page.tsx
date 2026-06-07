import { CalendarDays, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const trips = [
  {
    id: "kyoto",
    title: "京都",
    dates: "11 月 · 5 天",
    note: "枫叶季 · 古寺与庭园 · 怀石料理",
  },
  {
    id: "lisbon",
    title: "里斯本",
    dates: "日期待定",
    note: "海鲜 · 有轨电车 · 观景台落日",
  },
  {
    id: "reykjavik",
    title: "雷克雅未克",
    dates: "明年春天",
    note: "极光 · 蓝湖温泉 · 环岛公路",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <header className="flex flex-col items-start gap-4">
        <p className="text-primary text-sm font-semibold tracking-widest uppercase">
          行程规划
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          规划你的下一段旅程
        </h1>
        <p className="text-muted-foreground max-w-prose text-lg">
          收集目的地、安排日程、整理灵感 —— 一切从这里开始。
        </p>
        <Button size="lg" className="mt-2">
          <Plus />
          新建行程
        </Button>
      </header>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        {trips.map((trip) => (
          <Card key={trip.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="text-muted-foreground size-4" />
                {trip.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {trip.dates}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{trip.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
