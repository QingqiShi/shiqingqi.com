export function isFinanceConfigured(): boolean {
  return Boolean(process.env.FINANCE_DATABASE_URL);
}
