import { AirplaneTakeoffIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTakeoff";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

/**
 * A drawn stand-in rather than a photograph: the page needs to show what a
 * portrait avatar looks like without shipping a picture of a real person, and an
 * inline data URI keeps the specimen self-contained (no asset, no network).
 */
const PORTRAIT =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20fill='%236f5aa8'/%3E%3Ccircle%20cx='32'%20cy='25'%20r='11'%20fill='%23f0ecf7'/%3E%3Cpath%20d='M8%2064c0-14%2011-22%2024-22s24%208%2024%2022z'%20fill='%23f0ecf7'/%3E%3C/svg%3E";

export function AvatarShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Avatar
              size="sm"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
            />
          </Specimen>
          <Specimen caption="md">
            <Avatar
              size="md"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
            />
          </Specimen>
          <Specimen caption="lg">
            <Avatar
              size="lg"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Variants", zh: "样式" })}>
        <SpecimenGrid>
          <Specimen caption="subtle">
            <Avatar
              variant="subtle"
              size="lg"
              name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })}
            />
          </Specimen>
          <Specimen caption="solid">
            <Avatar
              variant="solid"
              size="lg"
              name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Subtle is the resting state for anyone present. Reserve solid for the few people a view is actually about, so they stand out of a row of their peers.",
            zh: "柔和样式用于仅仅在场的人。将实心样式留给该视图真正关注的少数人，使他们从同伴中脱颖而出。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Monogram", zh: "字母缩写" })}>
        <SpecimenGrid>
          <Specimen caption={t({ en: "two words", zh: "两个词" })}>
            <Avatar size="lg" name="Ada Lovelace" />
          </Specimen>
          <Specimen caption={t({ en: "one word", zh: "单个词" })}>
            <Avatar size="lg" name="石头" />
          </Specimen>
          <Specimen caption={t({ en: "three words", zh: "三个词" })}>
            <Avatar size="lg" name="Ada Byron Lovelace" />
          </Specimen>
          <Specimen caption='initials="A"'>
            <Avatar size="lg" name="Ada Lovelace" initials="A" />
          </Specimen>
        </SpecimenGrid>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Without a portrait the monogram comes from the first and last words of the name. A single word — including an unspaced CJK name — yields one character rather than two unrelated ones; initials overrides the derivation entirely.",
            zh: "没有头像时，字母缩写取自姓名的首词与末词。单个词——包括没有空格的中日韩姓名——只取一个字符，而非两个不相关的字符；initials 可完全覆盖该推导。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Portrait", zh: "头像图片" })}>
        <Specimen caption="src">
          <Avatar
            size="lg"
            src={PORTRAIT}
            name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
          />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Badge", zh: "角标" })}>
        <SpecimenGrid>
          <Specimen caption={t({ en: "departing", zh: "出发" })}>
            <Avatar
              size="lg"
              variant="solid"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
              badge={<AirplaneTakeoffIcon weight="bold" />}
              badgeLabel={t({ en: "departing", zh: "出发" })}
            />
          </Specimen>
          <Specimen caption={t({ en: "confirmed", zh: "已确认" })}>
            <Avatar
              size="lg"
              name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })}
              badge={<CheckIcon weight="bold" />}
              badgeLabel={t({ en: "confirmed", zh: "已确认" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The badge is drawn, so it says nothing on its own — badgeLabel carries its meaning and is required whenever a badge is set. Keeping it out of name is also what stops the label from corrupting the monogram.",
            zh: "角标只是图形，本身不表达任何信息——badgeLabel 承载其含义，且在设置角标时必填。把它与 name 分开，也避免了标签污染字母缩写。",
          })}
        </Text>
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "name",
              type: "string",
              required: true,
              description: t({
                en: "Who the avatar stands for. Names the avatar and, without src or initials, is the source of the monogram — so keep it to the person.",
                zh: "该头像代表的人。用于命名头像；在没有 src 与 initials 时，也是字母缩写的来源——因此只应写这个人。",
              }),
            },
            {
              name: "src",
              type: "string",
              description: t({
                en: "Portrait layered over the monogram. Rendered decoratively, since the root already carries the name — and if it fails to load the monogram shows through, so a URL that may 404 needs no handling at the callsite.",
                zh: "叠加在字母缩写之上的头像图片。以装饰性方式渲染，因为根元素已承载名称——若加载失败，下方的字母缩写会显现，因此可能 404 的地址无需在调用处额外处理。",
              }),
            },
            {
              name: "initials",
              type: "string",
              description: t({
                en: "Overrides the derived monogram, for when the derivation picks the wrong characters. An empty string counts as no override.",
                zh: "覆盖推导出的字母缩写，用于推导结果不合适的情况。空字符串视为未覆盖。",
              }),
            },
            {
              name: "size",
              type: '"sm" | "md" | "lg"',
              defaultValue: '"md"',
              description: t({
                en: "Diameter and type scale, in rem so the medallion scales with the user's font size.",
                zh: "直径与字号阶梯，以 rem 为单位，使徽章随用户字号缩放。",
              }),
            },
            {
              name: "variant",
              type: '"subtle" | "solid"',
              defaultValue: '"subtle"',
              description: t({
                en: "Subtle is a quiet tinted medallion; solid inverts it for the people a view is about.",
                zh: "柔和为低调的着色徽章；实心为反色，用于视图重点关注的人。",
              }),
            },
            {
              name: "badge",
              type: "ReactNode",
              description: t({
                en: "Corner marker on its own surface. Drawn aria-hidden, so badgeLabel is required alongside it.",
                zh: "位于角落、拥有独立表面的标记。以 aria-hidden 绘制，因此必须同时提供 badgeLabel。",
              }),
            },
            {
              name: "badgeLabel",
              type: "string",
              description: t({
                en: "What the badge means, appended to the accessible name. Required whenever badge is set, and omitted otherwise.",
                zh: "角标的含义，会追加到无障碍名称之后。设置 badge 时必填，否则不可传。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last so a caller can win over the defaults.",
                zh: "最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。",
              }),
            },
            {
              name: "…span attributes",
              type: 'ComponentProps<"span">',
              description: t({
                en: "Native span attributes (id, data-*, className, style, ref) are forwarded to the root.",
                zh: "原生 span 属性（id、data-*、className、style、ref）会转发到根元素。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Avatar
              size="lg"
              variant="solid"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
              badge={<AirplaneTakeoffIcon weight="bold" />}
              badgeLabel={t({ en: "departing", zh: "出发" })}
            />
          }
          doCaption={t({
            en: "Keep name to the person and let badgeLabel say what the badge means. The avatar still announces as one object, and the monogram derives from her name alone.",
            zh: "让 name 只表示这个人，由 badgeLabel 说明角标的含义。头像仍作为一个整体被朗读，字母缩写也只由姓名推导。",
          })}
          dont={
            <Avatar
              size="lg"
              variant="solid"
              name={t({
                en: "Ada Lovelace departing",
                zh: "阿达·洛芙莱斯 出发",
              })}
              badge={<AirplaneTakeoffIcon weight="bold" />}
              badgeLabel={t({ en: "departing", zh: "出发" })}
            />
          }
          dontCaption={t({
            en: "Don't fold the status into name — it is announced twice, and since the monogram takes the first and last words, it picks up a word that isn't part of her name.",
            zh: "不要把状态写进 name——它会被朗读两次；而且字母缩写取自首词与末词，会取到并不属于姓名的词。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  note: {
    maxInlineSize: measure.prose,
  },
});
