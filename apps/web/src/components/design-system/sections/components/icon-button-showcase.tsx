import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr/FloppyDisk";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { IconButton } from "@tuja/ui/components/icon-button";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function IconButtonShowcase() {
  const searchLabel = t({ en: "Search", zh: "搜索" });
  const editLabel = t({ en: "Edit", zh: "编辑" });
  const nextLabel = t({ en: "Next slide", zh: "下一张" });
  const favouriteLabel = t({ en: "Add to favourites", zh: "加入收藏" });
  const shareLabel = t({ en: "Share", zh: "分享" });
  const deleteLabel = t({ en: "Delete", zh: "删除" });

  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <IconButton
              size="sm"
              icon={<MagnifyingGlassIcon />}
              aria-label={searchLabel}
            />
          </Specimen>
          <Specimen caption="md">
            <IconButton
              size="md"
              icon={<MagnifyingGlassIcon />}
              aria-label={searchLabel}
            />
          </Specimen>
          <Specimen caption="lg">
            <IconButton
              size="lg"
              icon={<MagnifyingGlassIcon />}
              aria-label={searchLabel}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Variants", zh: "风格" })}>
        <div css={styles.stack}>
          <ShowcaseHelper>
            {t({
              en: 'variant="plain" is a transparent affordance that tints on hover — use it inline over a surface. variant="surface" adds an opaque fill and shadow so it floats over scrolling content.',
              zh: 'variant="plain" 为透明控件，悬停时着色——用于置于表面之上的行内场景。variant="surface" 添加不透明填充与阴影，使其悬浮于滚动内容之上。',
            })}
          </ShowcaseHelper>
          <SpecimenGrid>
            <Specimen
              caption={t({
                en: "plain · over a surface",
                zh: "plain · 置于表面之上",
              })}
            >
              <div css={[corner.radius_3, styles.surfaceScene]}>
                <IconButton
                  variant="plain"
                  icon={<PencilSimpleIcon />}
                  aria-label={editLabel}
                />
              </div>
            </Specimen>
            <Specimen
              caption={t({
                en: "surface · over canvas",
                zh: "surface · 悬浮于画布上",
              })}
            >
              <div css={[corner.radius_3, styles.canvasScene]}>
                <IconButton
                  variant="surface"
                  icon={<CaretRightIcon weight="bold" />}
                  aria-label={nextLabel}
                />
              </div>
            </Specimen>
          </SpecimenGrid>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Shape", zh: "形状" })}>
        <SpecimenGrid>
          <Specimen caption="circle">
            <IconButton
              shape="circle"
              variant="surface"
              icon={<HeartIcon />}
              aria-label={favouriteLabel}
            />
          </Specimen>
          <Specimen caption="square">
            <IconButton
              shape="square"
              variant="surface"
              icon={<ShareNetworkIcon />}
              aria-label={shareLabel}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Disabled & focus", zh: "禁用与聚焦" })}>
        <div css={styles.stack}>
          <SpecimenGrid>
            <Specimen caption="enabled">
              <IconButton icon={<TrashIcon />} aria-label={deleteLabel} />
            </Specimen>
            <Specimen caption="disabled">
              <IconButton
                icon={<TrashIcon />}
                aria-label={deleteLabel}
                disabled
              />
            </Specimen>
          </SpecimenGrid>
          <ShowcaseHelper>
            {t({
              en: "Tab to an enabled button to see the focus ring — it renders a real <button>, so keyboard focus, Enter, and Space work for free.",
              zh: "用 Tab 聚焦到启用的按钮即可看到焦点环——它渲染真实的 <button>，因此键盘聚焦、Enter 与 Space 均开箱即用。",
            })}
          </ShowcaseHelper>
        </div>
      </Showcase>

      <PropsTable
        rows={[
          {
            name: "icon",
            type: "ReactNode",
            required: true,
            description: t({
              en: "Icon rendered inside an aria-hidden wrapper — decorative, so the accessible name must come from aria-label / aria-labelledby.",
              zh: "图标渲染在 aria-hidden 包裹层内——为装饰性，无障碍名称须来自 aria-label / aria-labelledby。",
            }),
          },
          {
            name: "aria-label",
            type: "string",
            description: t({
              en: "Accessible name for the button. Provide exactly one of aria-label / aria-labelledby.",
              zh: "按钮的无障碍名称。aria-label 与 aria-labelledby 恰好提供其一。",
            }),
          },
          {
            name: "aria-labelledby",
            type: "string",
            description: t({
              en: "Id of a visible element that names the button — the alternative to aria-label.",
              zh: "为按钮命名的可见元素的 id——aria-label 的替代方案。",
            }),
          },
          {
            name: "size",
            type: '"sm" | "md" | "lg"',
            defaultValue: '"md"',
            description: t({
              en: 'Diameter scale via controlSize. "md"/"lg" clear the 44px touch target; reserve "sm" for pointer-dense desktop toolbars.',
              zh: '基于 controlSize 的直径阶梯。"md"/"lg" 满足 44px 触控目标；"sm" 建议仅用于指针密集的桌面工具栏。',
            }),
          },
          {
            name: "variant",
            type: '"plain" | "surface"',
            defaultValue: '"plain"',
            description: t({
              en: '"plain" is transparent with a hover tint; "surface" adds an opaque fill and drop shadow so it floats over content.',
              zh: '"plain" 透明并带悬停着色；"surface" 添加不透明填充与投影，使其悬浮于内容之上。',
            }),
          },
          {
            name: "shape",
            type: '"circle" | "square"',
            defaultValue: '"circle"',
            description: t({
              en: '"circle" is fully rounded; "square" uses rounded corners.',
              zh: '"circle" 为全圆角；"square" 为圆角矩形。',
            }),
          },
          {
            name: "disabled",
            type: "boolean",
            description: t({
              en: "Native disabled state — dims the button and blocks pointer and keyboard activation.",
              zh: "原生禁用状态——按钮变暗并阻止指针与键盘激活。",
            }),
          },
          {
            name: "css",
            type: "StyleXStyles",
            description: t({
              en: "StyleX overrides, composed last (e.g. absolute positioning for a floating control).",
              zh: "StyleX 覆盖样式，最后合成（例如为悬浮控件设置绝对定位）。",
            }),
          },
          {
            name: "...rest",
            type: 'ComponentProps<"button">',
            description: t({
              en: "Native button attributes (onClick, type, ref, inert, data-*) are forwarded.",
              zh: "原生 button 属性（onClick、type、ref、inert、data-*）会被转发。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <IconButton
            icon={<XIcon />}
            aria-label={t({ en: "Close", zh: "关闭" })}
          />
        }
        doCaption={t({
          en: "Always pass an accessible name (aria-label) — the icon is decorative and announces nothing on its own.",
          zh: "始终提供无障碍名称（aria-label）——图标为装饰性，本身不会被播报。",
        })}
        dont={
          <div css={styles.dontGroup}>
            <IconButton
              icon={<FloppyDiskIcon />}
              aria-label={t({ en: "Save changes", zh: "保存更改" })}
            />
            <Text variant="bodySmall" tone="muted">
              {t({ en: "Save changes", zh: "保存更改" })}
            </Text>
          </div>
        }
        dontCaption={t({
          en: "Don't stand in for a text action — a labelled, primary action reads far clearer as a Button with a visible label.",
          zh: "不要替代文字操作——带标签的主要操作用带可见文字的 Button 表达更清晰。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  surfaceScene: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: space._6,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  canvasScene: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: space._6,
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  dontGroup: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
});
