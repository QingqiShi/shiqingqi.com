"use server";

import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { DEV } from "esm-env";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE_MAX_AGE, gateToken, tripGate } from "#src/trip-gate.ts";

export interface UnlockState {
  error?: "wrong-password" | "unavailable";
}

// Verify a trip password and, on success, set this trip's unlock cookie and
// send the visitor back to the itinerary. The cookie is scoped to one trip, so
// unlocking here never grants access to any other trip.
export async function unlockTrip(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const slugValue = formData.get("slug");
  const slug = typeof slugValue === "string" ? slugValue : "";
  const gate = tripGate(slug);

  if (!gate || !gate.password) {
    return { error: "unavailable" };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password !== gate.password) {
    return { error: "wrong-password" };
  }

  const token = await gateToken(gate.realm, gate.password);
  const store = await cookies();
  store.set(gate.cookie, token, {
    httpOnly: true,
    secure: !DEV,
    sameSite: "lax",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE,
  });

  const locale = formData.get("locale");
  redirect(
    getLocalePath(
      `/${slug}`,
      validateLocale(typeof locale === "string" ? locale : ""),
    ),
  );
}
