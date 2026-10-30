import { AirplaneTakeoffIcon } from "@phosphor-icons/react/dist/ssr/AirplaneTakeoff";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Text } from "@tuja/ui/components/text";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";

/**
 * A drawn stand-in rather than a photograph: the page needs to show what a
 * portrait avatar looks like without shipping a picture of a real person, and an
 * inline data URI keeps the specimen self-contained (no asset, no network).
 */
const PORTRAIT =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20fill='%236f5aa8'/%3E%3Ccircle%20cx='32'%20cy='25'%20r='11'%20fill='%23f0ecf7'/%3E%3Cpath%20d='M8%2064c0-14%2011-22%2024-22s24%208%2024%2022z'%20fill='%23f0ecf7'/%3E%3C/svg%3E";

/**
 * A drawn stand-in for an organisation's logo, full-bleed like an app icon, so
 * the square shape shows what it does to a logo without a real brand.
 */
const LOGO =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20fill='%231f6f5c'/%3E%3Cpath%20d='M14%2046V18l18%2020V18h6v28L20%2026v20z'%20fill='%23eaf5f1'/%3E%3Ccircle%20cx='47'%20cy='42'%20r='4'%20fill='%23eaf5f1'/%3E%3C/svg%3E";

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

      <Showcase label={t({ en: "Looks", zh: "外观" })}>
        <SpecimenGrid>
          <Specimen caption="subtle">
            <Avatar
              look="subtle"
              size="lg"
              name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })}
            />
          </Specimen>
          <Specimen caption="solid">
            <Avatar
              look="solid"
              size="lg"
              name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Subtle is the resting state for anyone present. Reserve solid for the few people a view is actually about, so they stand out of a row of their peers.",
            zh: "柔和样式用于仅仅在场的人。将实心样式留给该视图真正关注的少数人，使他们从同伴中脱颖而出。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Shapes", zh: "形状" })}>
        <SpecimenGrid>
          <Specimen caption="circle">
            <Avatar
              size="lg"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
            />
          </Specimen>
          <Specimen caption="square">
            <Avatar
              shape="square"
              size="lg"
              name={t({ en: "Northwind Bank", zh: "北风银行" })}
            />
          </Specimen>
          <Specimen
            caption={t({ en: "square with a logo", zh: "带标志的方形" })}
          >
            <Avatar
              shape="square"
              size="lg"
              src={LOGO}
              name={t({ en: "Northwind Bank", zh: "北风银行" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A circle is a person. A square is an organisation, such as a bank: its logo is usually drawn as a square app icon, so a circle would crop it, and the square tells it apart from the people beside it.",
            zh: "圆形代表人。方形代表机构，例如银行：机构标志通常按方形应用图标绘制，圆形会将其裁切；方形也让它与旁边的人区分开来。",
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
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Without a portrait the monogram comes from the first and last words of the name. A single word — including an unspaced CJK name — yields one character rather than two unrelated ones; initials overrides the derivation entirely.",
            zh: "没有头像时，字母缩写取自姓名的首词与末词。单个词——包括没有空格的中日韩姓名——只取一个字符，而非两个不相关的字符；initials可完全覆盖该推导。",
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
              look="solid"
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
        <Text look="bodySmall" tone="muted">
          {t({
            en: "The badge is drawn, so it says nothing on its own — badgeLabel carries its meaning and is required whenever a badge is set. Keeping it out of name is also what stops the label from corrupting the monogram.",
            zh: "角标只是图形，本身不表达任何信息——badgeLabel承载其含义，且在设置角标时必填。把它与name分开，也避免了标签污染字母缩写。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="avatar" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Avatar
              size="lg"
              look="solid"
              name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
              badge={<AirplaneTakeoffIcon weight="bold" />}
              badgeLabel={t({ en: "departing", zh: "出发" })}
            />
          }
          doCaption={t({
            en: "Keep name to the person and let badgeLabel say what the badge means. The avatar still announces as one object, and the monogram derives from her name alone.",
            zh: "让name只表示这个人，由badgeLabel说明角标的含义。头像仍作为一个整体被朗读，字母缩写也只由姓名推导。",
          })}
          dont={
            <Avatar
              size="lg"
              look="solid"
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
            zh: "不要把状态写进name——它会被朗读两次；而且字母缩写取自首词与末词，会取到并不属于姓名的词。",
          })}
        />
      </Showcase>
    </>
  );
}
