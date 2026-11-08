export async function register() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_RUNTIME === "nodejs"
  ) {
    const { seedDevStore } = await import("./server/dev/seed-dev-store.ts");
    await seedDevStore(Date.now());
  }
}
