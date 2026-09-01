import { Info } from "lucide-react";
import { Section } from "./section";
import { TipRow } from "./tip-row";
import type { Tip } from "@/data/types";

/** Practical heads-ups for the day (parking, fuel, driving rules, transit). */
export function TipsSection({
  tips,
  title = "实用提示",
}: {
  tips: Tip[];
  title?: string;
}) {
  return (
    <Section icon={Info} title={title}>
      <ul className="space-y-2.5">
        {tips.map((tip) => (
          <TipRow key={tip.text} tip={tip} />
        ))}
      </ul>
    </Section>
  );
}
