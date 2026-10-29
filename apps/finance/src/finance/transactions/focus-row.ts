/** Moves focus to the row of `transactionId` in the Transactions list, after the list draws. */
export function focusRow(transactionId: string) {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(
        `[data-transaction-id="${CSS.escape(transactionId)}"]`,
      )
      ?.focus();
  });
}
