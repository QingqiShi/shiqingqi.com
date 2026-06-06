// Author-mode routes are a local-dev tool. They must never respond in a
// deployed build. Gating on `=== "production"` (rather than `!== "development"`)
// blocks every deployed/preview build while leaving the routes reachable under
// `NODE_ENV=test`, so the handler logic stays testable without env stubbing.
export function blockInProduction(): Response | null {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  return null;
}
