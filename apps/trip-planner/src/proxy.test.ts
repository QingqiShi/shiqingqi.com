import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { proxy } from "./proxy";

it("passes an API request on with no redirect to a locale", () => {
  const response = proxy(
    new NextRequest("http://localhost:3000/api/auth/sign-up", {
      headers: { "Accept-Language": "zh-CN,zh;q=0.9" },
    }),
  );

  expect(response.headers.get("Location")).toBeNull();
  expect(response.headers.get("x-middleware-next")).toBe("1");
});
