import { DEV } from "esm-env";

export async function register() {
  if (DEV && process.env.NEXT_RUNTIME === "nodejs") {
    const { seedDevStore } = await import("./server/dev/seed-dev-store.ts");
    await seedDevStore(Date.now());
  }
}
