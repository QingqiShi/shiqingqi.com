import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { t } from "@tuja/i18n";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";
import { specimenLayout } from "./specimen.stylex.ts";

export function NavListSpecimen() {
  return (
    <nav
      aria-label={t({ en: "Navigation list", zh: "导航列表" })}
      css={specimenLayout.fill}
    >
      <NavList>
        <NavLink href="#" current icon={<HouseIcon weight="bold" />}>
          {t({ en: "Home", zh: "首页" })}
        </NavLink>
        <NavLink href="#" icon={<ChartBarIcon weight="bold" />}>
          {t({ en: "Reports", zh: "报告" })}
        </NavLink>
        <NavLink href="#" icon={<GearSixIcon weight="bold" />}>
          {t({ en: "Settings", zh: "设置" })}
        </NavLink>
      </NavList>
    </nav>
  );
}
