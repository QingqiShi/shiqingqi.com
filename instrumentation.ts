export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side instrumentation (none needed)
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime instrumentation (none needed)
  }
}
