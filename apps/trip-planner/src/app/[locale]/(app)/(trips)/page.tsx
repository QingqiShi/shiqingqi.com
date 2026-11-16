import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
import { t } from "@tuja/i18n";
import { EmptyState } from "@tuja/ui/components/empty-state";

/** Beside the trip list, before a trip is open. Where the list has no room, the list is this page. */
export default function HomePage() {
  return (
    <EmptyState
      level={2}
      icon={<SuitcaseRollingIcon weight="bold" />}
      title={t({ en: "Pick a trip", zh: "选择一个行程" })}
      description={t({
        en: "Each trip has its own password. You enter it once, the first time you open the trip.",
        zh: "每个行程有各自的密码，首次打开时输入一次即可。",
      })}
    />
  );
}
