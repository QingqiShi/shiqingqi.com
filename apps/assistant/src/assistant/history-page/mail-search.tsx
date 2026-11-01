import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { FoundMail } from "../history/search-mail.ts";

/**
 * Search over the stored mail by sender, subject and category. A plain GET
 * form: the query lives in the URL, so a search can be reloaded and shared
 * between the user's own devices.
 */
export function MailSearch({
  query,
  categoryId,
  categories,
  results,
  searched,
  formatDate,
}: {
  query: string;
  categoryId: string | null;
  categories: readonly { id: string; name: string }[];
  results: readonly FoundMail[];
  searched: boolean;
  formatDate: (date: Date) => string;
}) {
  const noSubject = t({ en: "(no subject)", zh: "（无主题）" });
  const oldMail = t({ en: "Old mail", zh: "旧邮件" });
  const openMail = t({ en: "Open mail", zh: "打开原邮件" });
  return (
    <div css={stack.item}>
      <form method="get" css={stack.item}>
        <TextField
          label={t({ en: "Sender or subject", zh: "发件人或主题" })}
          name="q"
          type="search"
          defaultValue={query}
          maxLength={200}
        />
        <Select
          label={t({ en: "Category", zh: "分类" })}
          name="category"
          defaultValue={categoryId ?? ""}
          options={[
            { value: "", label: t({ en: "Any category", zh: "任意分类" }) },
            ...categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
        />
        <div>
          <Button type="submit" look="outline">
            {t({ en: "Search", zh: "搜索" })}
          </Button>
        </div>
      </form>
      {searched && results.length === 0 ? (
        <Text as="p" tone="muted">
          {t({ en: "No stored mail matches.", zh: "没有匹配的已存邮件。" })}
        </Text>
      ) : null}
      {results.length > 0 ? (
        <ul css={styles.list}>
          {results.map((mail) => (
            <li key={mail.id} css={[stack.tight, styles.item]}>
              <div css={stack.text}>
                <Text weight="medium">{mail.subject || noSubject}</Text>
                <Text look="bodySmall" tone="muted">
                  {[mail.fromName, mail.fromAddress]
                    .filter(Boolean)
                    .join(" · ")}
                  {" · "}
                  {formatDate(mail.receivedAt)}
                </Text>
              </div>
              <div css={cluster.tight}>
                {mail.category ? (
                  <Badge intent="neutral" size="sm">
                    {mail.category}
                  </Badge>
                ) : null}
                {mail.origin === "history" ? (
                  <Badge intent="neutral" size="sm">
                    {oldMail}
                  </Badge>
                ) : null}
                <AnchorButton
                  href={mail.href}
                  size="sm"
                  look="ghost"
                  icon={<ArrowSquareOutIcon weight="bold" />}
                  {...(mail.href.startsWith("https://")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {openMail}
                </AnchorButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    paddingBlockEnd: space._4,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
});
