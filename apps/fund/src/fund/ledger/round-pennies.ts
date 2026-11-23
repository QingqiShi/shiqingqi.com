export function roundPennies(amount: number): number {
  const pennies = Math.round(Math.abs(amount) * 100 + 1e-7);
  return pennies === 0 ? 0 : (Math.sign(amount) * pennies) / 100;
}
