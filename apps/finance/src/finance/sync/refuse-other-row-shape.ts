import { financeJson } from "../http/finance-json.ts";
import {
  readRowShape,
  ROW_SHAPE_MISMATCH_STATUS,
} from "./replica-row-shape.ts";

/** A refusal for a request from code with another row shape, or null when the shapes match. */
export function refuseOtherRowShape(request: Request, rowShape: number) {
  const clientShape = readRowShape(request.headers);
  if (clientShape === undefined) {
    return financeJson({ error: "invalid-row-shape" }, { status: 400 });
  }
  if (clientShape === rowShape) return null;
  return financeJson(
    { error: "row-shape", rowShape },
    { status: ROW_SHAPE_MISMATCH_STATUS },
  );
}
