export interface FinanceSession {
  sessionId: string;
  userId: string;
  householdId: string;
  memberId: string;
  role: "owner" | "member";
}
