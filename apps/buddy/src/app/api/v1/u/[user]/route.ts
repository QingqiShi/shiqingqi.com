import { readPublicPetState } from "#src/server/read-public-pet-state.ts";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/u/[user]">,
) {
  const { user } = await params;
  const state = await readPublicPetState(user);
  const headers = { "Access-Control-Allow-Origin": "*" };
  if (!state) {
    return Response.json({ error: "not found" }, { status: 404, headers });
  }
  // No stale-while-revalidate: a page made private must leave the CDN
  // within the 30 s.
  return Response.json(state, {
    headers: { ...headers, "Cache-Control": "public, s-maxage=30" },
  });
}
