export interface ExchangeRateCursor {
  seq: number;
  pairsId: string;
}

export const exchangeRateCursor = {
  format(cursor: ExchangeRateCursor) {
    return `${String(cursor.seq)}.${cursor.pairsId}`;
  },

  parse(text: string | null | undefined): ExchangeRateCursor | null {
    const match = /^(\d{1,15})\.([0-9a-f]{16})$/.exec(text ?? "");
    if (!match) return null;
    return { seq: Number(match[1]), pairsId: match[2] };
  },
};
