"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, layer, space } from "@tuja/ui/tokens.stylex";
import { Fragment, useState } from "react";

const ROWS = Array.from({ length: 12 }, (_, index) => index + 1);
const EXTRA_REGIONS = [1, 2, 3, 4];

function RegionRow({ index }: { index: number }) {
  const [view, setView] = useState<"grid" | "list">(
    index % 2 === 0 ? "list" : "grid",
  );
  const label = `${t({ en: "Row", zh: "行" })} ${String(index)}`;
  return (
    <div css={[row.item, styles.row]}>
      <Text look="bodySmall">{label}</Text>
      <SegmentedControl
        aria-label={label}
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
          { value: "list", label: t({ en: "List", zh: "列表" }) },
        ]}
      />
    </div>
  );
}

/**
 * A sticky bar in the middle of the region, with a Switch. It sticks only
 * after the region scrolls past it.
 */
function StickyRegionBar() {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div
      ref={ref}
      data-effect-test-region-sticky=""
      css={[row.item, styles.row, styles.stickyBar, css]}
    >
      <EffectCarrier value={sticky}>
        <Text look="bodySmall">
          {t({ en: "Sticky bar in region", zh: "区域中的吸顶栏" })}
        </Text>
        <Switch
          aria-label={t({
            en: "Switch in sticky bar",
            zh: "吸顶栏中的开关",
          })}
        />
      </EffectCarrier>
    </div>
  );
}

/**
 * A vertical Scroll mask whose rows each hold a Segmented control, with a
 * sticky bar after row 4, and a button that adds four more small Scroll
 * regions with a Switch each, so that many regions draw at one time. It
 * mounts on a button press, so that the other benches on the page keep their
 * own elements.
 */
export function ScrollRegionTestBench() {
  const [isShown, setIsShown] = useState(false);
  const [showsMore, setShowsMore] = useState(false);
  const switchLabel = t({ en: "Switch in region", zh: "区域中的开关" });
  if (!isShown) {
    return (
      <div css={styles.actions}>
        <Button
          look="outline"
          size="sm"
          onClick={() => {
            setIsShown(true);
          }}
        >
          {t({ en: "Show the Scroll region bench", zh: "显示滚动区域测试台" })}
        </Button>
      </div>
    );
  }
  return (
    <div css={stack.item}>
      <ScrollMask
        data-effect-test-region=""
        css={[corner.radius_3, styles.region]}
        contentCss={[stack.item, styles.regionContent]}
      >
        {ROWS.map((index) => (
          <Fragment key={index}>
            <RegionRow index={index} />
            {index === 4 && <StickyRegionBar />}
          </Fragment>
        ))}
      </ScrollMask>
      <div css={styles.actions}>
        <Button
          look="outline"
          size="sm"
          onClick={() => {
            setShowsMore(!showsMore);
          }}
        >
          {showsMore
            ? t({
                en: "Hide the four extra Scroll regions",
                zh: "隐藏另外四个滚动区域",
              })
            : t({
                en: "Show four extra Scroll regions",
                zh: "显示另外四个滚动区域",
              })}
        </Button>
      </div>
      {showsMore && (
        <div css={cluster.item}>
          {EXTRA_REGIONS.map((index) => (
            <ScrollMask
              key={index}
              css={[corner.radius_3, styles.smallRegion]}
              contentCss={[stack.item, styles.regionContent]}
            >
              <Switch aria-label={`${switchLabel} ${String(index)}`} />
              <div css={styles.filler} />
            </ScrollMask>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  region: {
    blockSize: "16rem",
    borderColor: color.border,
    borderStyle: "solid",
    borderWidth: border.size_1,
  },
  regionContent: {
    padding: space._3,
  },
  row: {
    justifyContent: "space-between",
  },
  stickyBar: {
    position: "sticky",
    insetBlockStart: 0,
    zIndex: layer.raised,
    backgroundColor: color.bgSurface,
  },
  actions: {
    display: "flex",
  },
  smallRegion: {
    blockSize: "8rem",
    inlineSize: "10rem",
    borderColor: color.border,
    borderStyle: "solid",
    borderWidth: border.size_1,
  },
  filler: {
    blockSize: "16rem",
  },
});
