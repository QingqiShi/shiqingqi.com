export function isAssistantConfigured(): boolean {
  return Boolean(process.env.ASSISTANT_DATABASE_URL);
}
