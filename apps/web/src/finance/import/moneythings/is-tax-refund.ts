/** A tax refund pays back income that was never received: it names HMRC or says 退税. */
export function isTaxRefund(text: string) {
  return /\bhmrc\b/iu.test(text) || text.includes("退税");
}
