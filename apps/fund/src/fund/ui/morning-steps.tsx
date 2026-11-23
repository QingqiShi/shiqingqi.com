import { CheckSquareIcon } from "@phosphor-icons/react/dist/ssr/CheckSquare";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { t } from "@tuja/i18n";
import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { stack } from "@tuja/ui/primitives/stack.stylex";

/** The owner's routine in three steps, for a Desk that has no decisions yet. */
export function MorningSteps() {
  return (
    <Card>
      <div css={stack.item}>
        <CardHeader>
          <CardTitle level={3}>
            {t({ en: "Each trading morning", zh: "每个交易日早上" })}
          </CardTitle>
        </CardHeader>
        <List form="plain">
          <ListRow
            wrap
            leading={<CheckSquareIcon weight="bold" />}
            leadingShape="circle"
            leadingSize="sm"
            detail={t({
              en: "Say whether yesterday's orders filled.",
              zh: "说明昨天的订单是否成交。",
            })}
          >
            {t({ en: "1. Answer the orders", zh: "1. 回答订单" })}
          </ListRow>
          <ListRow
            wrap
            leading={<UsersThreeIcon weight="bold" />}
            leadingShape="circle"
            leadingSize="sm"
            detail={t({
              en: "The agents meet before the open.",
              zh: "智能体们在开盘前开会。",
            })}
          >
            {t({ en: "2. Hold the meeting", zh: "2. 召开会议" })}
          </ListRow>
          <ListRow
            wrap
            leading={<ReceiptIcon weight="bold" />}
            leadingShape="circle"
            leadingSize="sm"
            detail={t({
              en: "Enter each limit order with your broker.",
              zh: "在券商处逐笔下限价单。",
            })}
          >
            {t({ en: "3. Place the orders", zh: "3. 下单" })}
          </ListRow>
        </List>
      </div>
    </Card>
  );
}
