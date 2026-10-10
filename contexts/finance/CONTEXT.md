# Finance

A private household finance tracker at `/finance` (ZH: 家庭账本): two people record what they spend and earn, keep every account's balance current, and read a weekly report of their net worth. It replaces the MoneyThings app and a hand-made Numbers sheet. The home page lists it as a project, but it stays private: it has no sitemap entry, is `noindex`, and every page except sign-in and invite needs a passkey session. Balances follow one rule for every account — the latest Valuation on or before a day, plus every Entry dated after it and on or before that day.

## Language

**Household**:
The tenant: the people who share one set of accounts and one base currency. All data belongs to exactly one household. ZH: 家庭.
_Avoid_: tenant, workspace, scene, ledger (MoneyThings 场景)

**Member**:
A person in a household, used for attribution ("who spent"). A member may exist without a sign-in (created by import or by name) and is bound to a **User** when that person accepts an invite or claims it at setup. The owner can **remove** a member (ZH: 移除): it is a soft delete that signs them out everywhere, deletes their passkeys and cancels their invites; past transactions keep their name, new ones cannot choose them. A removed member brought back by Undo has no sign-in until a new invite. ZH: 成员.
_Avoid_: participant, owner (for this sense)

**Owner**:
The member who set up the household (role `owner`). Only the owner changes the household, its Connections and its members' recovery links, and removes members. The owner cannot remove themselves, so the household always keeps an owner. ZH: 所有者.
_Avoid_: admin

**Shared**:
What an account or a transaction is when no member owns it (`member_id` is null): the household's, not one person's. ZH: 共同.
_Avoid_: household (for this sense), joint, no member

**Invite**:
A one-use link that binds a member to a new User and a passkey. A **Recovery link** (ZH: 恢复链接) is an invite for a member who lost every passkey: signing in with it replaces that member's old passkeys and signs out every other device. ZH: 邀请.
_Avoid_: reset link, magic link

**User**:
A sign-in identity with passkeys. A user can belong to several households later; v1 has one.
_Avoid_: account (reserved for money)

**Account**:
One balance in one currency: a current account, a savings pot, a credit card, an ISA, a pension, the house, a mortgage, money a friend owes. It is the MoneyThings _sub-account_; the MoneyThings _account_ becomes the `institution` text (ZH: 机构). An account is owned by one member or is Shared. ZH: 账户.
_Avoid_: sub-account, pot, wallet

**Kind** (of account):
What the account behaves like: `cash` (current or savings, bank-linkable), `credit` (a card: a liability with a limit, a statement day and a due day), `investment` (valuation-driven), `property`, `loan` (a liability: mortgage, student loan, Help to Buy, instalment plan), `receivable` (an asset: money lent out or reimbursable). The UI names them Cash, Credit card, Investment, Property, Loan and Money owed to you (ZH: 现金, 信用卡, 投资, 房产, 贷款, 应收款). **Side** is derived from it: `credit` and `loan` are liabilities (ZH: 负债), the rest are assets (ZH: 资产). ZH: 类型; Side: 资产或负债.
_Avoid_: asset type, account type (that is Group)

**Group**:
A household-defined bucket for the balance sheet (流动资产, 投资, 退休资产, 不动产, 学贷, 信用). An account belongs to one group; a group holds assets or liabilities, not both. ZH: 分组.
_Avoid_: category (reserved for transactions), account type

**Valuation**:
A balance asserted for an account at the end of a day: a statement balance, a pension value, a house price, a mortgage balance. The balance engine trusts it over everything dated on or before it, so an Entry on the same day is inside it. It is the MoneyThings anchor plus modify log. The UI verb that makes one is "Update balance" (ZH: 更新余额), and "Update balances" (ZH: 批量更新余额) makes several at once; the Ledger labels one "Balance set". ZH: 余额记录.
_Avoid_: anchor, snapshot, modify log, balance update (a UI verb only)

**Opening balance**:
The Valuation made on the day an account is created, from the "Balance today" field when it is not zero. ZH: 期初余额.
_Avoid_: initial balance, starting balance

**Ledger**:
An account's list of Entries and Valuations, newest first, each with the balance after it. ZH: 明细.
_Avoid_: flow (流水), statement, history

**Transaction**:
Something that happened: an expense, an income, or a transfer, on one date, with one stats amount in the base currency, one Category (expense or income), one Payee, one Member, Tags and a note. ZH: 交易.
_Avoid_: flow (流水), record

**Entry**:
The movement one transaction makes on one account, signed, in that account's currency. An expense usually has one entry; a transfer has two (one negative, one positive, possibly in different currencies); a mortgage payment has two (cash −X, loan +X). Balances are sums of entries; statistics are sums of transaction amounts. ZH: 账户变动.
_Avoid_: leg, posting, line

**Refund**:
An expense with a positive amount, optionally linked to the original expense. Spending statistics net it against its category with no extra step. A tax refund is an income, not a Refund: it pays back income, not spending. ZH: 退款.

**Expected**:
A transaction a Rule says will happen, not yet confirmed. It does not count in balances or statistics until it is confirmed. As a status label it is capitalised ("Expected"); in a sentence it is "an expected transaction". ZH: 待确认.
_Avoid_: pending (that is the bank's word for an unsettled card payment), scheduled, pre-generated

**Coming up**:
The folded section at the top of the transaction list that holds Expected transactions dated after today. Code calls it `upcoming`. ZH: 即将到期.
_Avoid_: future, scheduled

**Rule** (recurring rule):
A schedule plus a transaction template that produces Expected transactions. A rule that "posts automatically" (ZH: 自动入账) makes a confirmed transaction on the day instead. ZH: 周期规则.
_Avoid_: crontab, template, one-touch, subscription

**Instalment plan**:
A purchase paid in monthly payments: the purchase is the first payment, a `loan` account left out of net worth tracks what is still owed, and a Rule makes the other payments. ZH: 分期.
_Avoid_: BNPL, installment (US spelling), split payment

**Category**:
The household's spending and income taxonomy, a tree (two levels in practice, any depth allowed). Each has a kind, expense or income. Transfers carry no category. ZH: 分类.
_Avoid_: primary/secondary category (say parent/child), tag

**Uncategorised**:
The system Category, one for expense and one for income, that every household gets at creation. A bank-imported transaction with no better match lands in it. It always shows as "Uncategorised" (ZH: 未分类) in the reader's language, whatever its stored name. It is not the same as "No category" (ZH: 无分类), which analytics shows for a transaction whose category is null.
_Avoid_: other, misc, unknown

**Payee**:
The merchant or person on the other side: Ocado, Netflix, Deliveroo, a friend. A payee remembers its usual category, account and tags, and the bank-statement strings (**aliases**) that identify it. Most MoneyThings tags become payees. ZH: 商家.
_Avoid_: merchant (in code), vendor, tag

**Tag**:
A free label that cuts across categories and payees: 地铁, 火车, who a treat was for. Zero or more per transaction. ZH: 标签.

**Review**:
The queue of transactions that need a human look: bank-imported with low AI confidence, a bank balance that disagrees, a bank transaction that disappeared. A transaction has `needs_review`; the queue is a filter, not a status. "Looks right" (ZH: 没问题) clears the flag: the transaction is then reviewed. ZH: 待审核.

**Bank link**:
The binding of one account to one provider account (a Lunch Flow account id). ZH: 银行关联. A **Connection** is the provider credential a household owns. ZH: 银行连接.
_Avoid_: integration, feed

**Bank balance**:
The balance the bank reports for a linked account on a sync. When it disagrees with the balance the household recorded, a **balance check** shows "Bank says … we say …" (ZH: 银行显示 … 账本显示 …) and offers to set a Valuation at the bank balance. ZH: 银行余额.
_Avoid_: statement balance (that is a Valuation source)

**Replica**:
The household's data held in the browser (IndexedDB and memory) and kept in step with the server through pull and push. The **Outbox** holds mutations made offline, waiting to be pushed.
_Avoid_: cache (for the replica), queue

**Report**:
A stored weekly snapshot of the balance sheet and the week's spending. ZH: 周报.

**Property net**:
A report figure: each `property` account's value less the loans in the liability groups named after it. ZH: 房产净值.
_Avoid_: equity, home equity

**Base currency**:
The one currency of the household's totals, net worth and statistics. An account in another currency counts in it at the latest **exchange rate** (ZH: 汇率) on or before each day. ZH: 本位币.
_Avoid_: home currency, default currency

**Minor units**:
How every amount is stored: an integer count of the currency's smallest unit (pence for GBP, fen for CNY), never a float. The currency's exponent says how many decimal places a major unit has.
_Avoid_: cents (for every currency), decimal amount
