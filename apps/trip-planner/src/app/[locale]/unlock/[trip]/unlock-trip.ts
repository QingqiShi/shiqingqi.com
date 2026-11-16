"use server";

import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE_MAX_AGE, gateToken, tripGate } from "@/trip-gate";

export interface UnlockState {
  error?: string;
}

// Verify a trip password and, on success, set this trip's unlock cookie and
// send the visitor back to the itinerary, in the locale of the form. The cookie
// is scoped to one trip, so unlocking here never grants access to any other
// trip. The return path is built from the slug and the locale, never taken
// from the form as a URL, so it cannot lead to another site.
export async function unlockTrip(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const slugValue = formData.get("slug");
  const slug = typeof slugValue === "string" ? slugValue : "";
  const gate = tripGate(slug);

  if (!gate || !gate.password) {
    return { error: "暂时无法验证密码，请稍后再试" };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password !== gate.password) {
    return { error: "密码错误，请重试" };
  }

  const token = await gateToken(gate.realm, gate.password);
  const store = await cookies();
  store.set(gate.cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_COOKIE_MAX_AGE,
  });

  const localeValue = formData.get("locale");
  const locale = validateLocale(
    typeof localeValue === "string" ? localeValue : "",
  );
  redirect(getLocalePath(`/${slug}`, locale));
}
