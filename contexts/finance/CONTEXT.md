# Finance

A private household finance tracker at `/finance` (ZH: 家庭账本): two people record what they spend and earn, keep every account's balance current, and read a weekly report of their net worth. It replaces the MoneyThings app and a hand-made Numbers sheet, so some entries map a MoneyThings word to ours.

## Language

**Household**:
The tenant: the people who share one set of accounts and one base currency. ZH: 家庭.
_Avoid_: tenant, workspace, scene, ledger (MoneyThings 场景)

**Member**:
A person in a household, used for attribution ("who spent"). A member may have no sign-in; one who signs in is bound to a **User**. To **remove** a member (ZH: 移除) is to soft-delete them. ZH: 成员.
_Avoid_: participant, owner (for this sense)

**Owner**:
The member who set up the household (role `owner`). ZH: 所有者.
_Avoid_: admin

**Shared**:
What an account or a transaction is when no member owns it (`member_id` is null): the household's, not one person's. ZH: 共同.
_Avoid_: household (for this sense), joint, no member

**Invite**:
A one-use link that binds a member to a new User and a passkey. A **Recovery link** (ZH: 恢复链接) is an invite for a member who lost every passkey. ZH: 邀请.
_Avoid_: reset link, magic link

**User**:
A sign-in identity with passkeys.
_Avoid_: account (reserved for money)

**Account**:
One balance in one currency: a current account, a savings pot, a credit card, an ISA, a pension, the house, a mortgage, money a friend owes. It is the MoneyThings _sub-account_; the MoneyThings _account_ is our `institution` text (ZH: 机构). ZH: 账户.
_Avoid_: sub-account, pot, wallet

**Kind** (of account):
What the account behaves like: `cash` (current or savings), `credit` (a card), `investment`, `property`, `loan` (mortgage, student loan, Help to Buy, instalment plan), `receivable` (money lent out or reimbursable). The UI names them Cash, Credit card, Investment, Property, Loan and Money owed to you (ZH: 现金, 信用卡, 投资, 房产, 贷款, 应收款). **Side** is derived from it: `credit` and `loan` are liabilities (ZH: 负债), the rest are assets (ZH: 资产). ZH: 类型; Side: 资产或负债.
_Avoid_: asset type, account type (that is Group)

**Group**:
A household-defined bucket for the balance sheet (流动资产, 投资, 退休资产, 不动产, 学贷, 信用). ZH: 分组.
_Avoid_: category (reserved for transactions), account type

**Valuation**:
A balance asserted for an account at the end of a day: a statement balance, a pension value, a house price, a mortgage balance. It is the MoneyThings anchor plus modify log. The UI verb that makes one is "Update balance" (ZH: 更新余额), and "Update balances" (ZH: 批量更新余额) makes several at once; the Ledger labels one "Balance set". ZH: 余额记录.
_Avoid_: anchor, snapshot, modify log, balance update (a UI verb only)

**Opening balance**:
The Valuation made on the day an account is created. ZH: 期初余额.
_Avoid_: initial balance, starting balance

**Ledger**:
An account's list of Entries and Valuations, newest first, each with the balance after it. ZH: 明细.
_Avoid_: flow (流水), statement, history

**Transaction**:
Something that happened — an expense, an income, or a transfer — with its amount in the base currency. ZH: 交易.
_Avoid_: flow (流水), record

**Entry**:
The movement one transaction makes on one account, signed, in that account's currency. A transfer has two: one negative, one positive. ZH: 账户变动.
_Avoid_: leg, posting, line

**Refund**:
An expense with a positive amount. A tax refund is an income, not a Refund. ZH: 退款.

**Expected**:
A transaction a Rule says will happen, not yet confirmed. As a status label it is capitalised ("Expected"); in a sentence it is "an expected transaction". ZH: 待确认.
_Avoid_: pending (that is the bank's word for an unsettled card payment), scheduled, pre-generated

**Coming up**:
The folded section at the top of the transaction list that holds Expected transactions dated after today. Code calls it `upcoming`. ZH: 即将到期.
_Avoid_: future, scheduled

**Rule** (recurring rule):
A schedule plus a transaction template that produces Expected transactions. A rule that "posts automatically" (ZH: 自动入账) makes a confirmed transaction on the day instead. ZH: 周期规则.
_Avoid_: crontab, template, one-touch, subscription

**Instalment plan**:
A purchase paid in monthly payments, with a `loan` account for what is still owed. ZH: 分期.
_Avoid_: BNPL, installment (US spelling), split payment

**Category**:
The household's spending and income taxonomy, a tree. Each category is an expense or an income category. ZH: 分类.
_Avoid_: primary/secondary category (say parent/child), tag

**Uncategorised**:
The system Category, one for expense and one for income. ZH: 未分类. It is not "No category" (ZH: 无分类), which means the category is null.
_Avoid_: other, misc, unknown

**Payee**:
The merchant or person on the other side: Ocado, Netflix, Deliveroo, a friend. The bank-statement strings that identify a payee are its **aliases**. ZH: 商家.
_Avoid_: merchant (in code), vendor, tag

**Tag**:
A free label that cuts across categories and payees: 地铁, 火车, who a treat was for. ZH: 标签.

**Review**:
The queue of transactions that need a human look, which are those with `needs_review` set: a filter, not a status. "Looks right" (ZH: 没问题) clears the flag, and the transaction is then **reviewed**. ZH: 待审核.

**Bank link**:
The binding of one account to one provider account (a Lunch Flow account id). ZH: 银行关联. A **Connection** is the household's provider credential. ZH: 银行连接.
_Avoid_: integration, feed

**Bank balance**:
The balance the bank reports for a linked account on a sync. A **balance check** compares it with the balance the household recorded. ZH: 银行余额.
_Avoid_: statement balance (that is a Valuation source)

**Replica**:
The household's data held in the browser (IndexedDB and memory) and kept in step with the server through pull and push. The **Outbox** holds mutations made offline, waiting to be pushed.
_Avoid_: cache (for the replica), queue

**Report**:
A stored weekly snapshot of the balance sheet and the week's spending. The server holds Reports, not the Replica: the Monday cron makes last week's, Regenerate makes one week again, and the backfill makes every week again and deletes the weeks before the first. A device keeps the last Reports list it read and each Report in that list it read, so they show offline; sign-out deletes them with the Replica. ZH: 周报.

**Property net**:
A report figure: each `property` account's value less the loans in the liability groups named after it. ZH: 房产净值.
_Avoid_: equity, home equity

**Base currency**:
The one currency of the household's totals, net worth and statistics. An **exchange rate** (ZH: 汇率) converts another currency into it. ZH: 本位币.
_Avoid_: home currency, default currency

**Minor units**:
An amount as an integer count of the currency's smallest unit (pence for GBP, fen for CNY). The currency's exponent is how many decimal places a major unit has.
_Avoid_: cents (for every currency), decimal amount
