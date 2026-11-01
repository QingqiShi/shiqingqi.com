import "server-only";
import { mailRouteDeps } from "../mail-route-deps.ts";
import { makeCategoryHandlers } from "./make-category-handlers.ts";

export const categoryHandlers = makeCategoryHandlers(mailRouteDeps);
