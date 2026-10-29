import { ROW_SHAPE_HEADER } from "./replica-row-shape.ts";

/** Every response that the handler returns says the server's row shape; an error that it throws goes on to Next. */
export function withRowShape(
  rowShape: number,
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    const response = await handler(request);
    response.headers.set(ROW_SHAPE_HEADER, String(rowShape));
    return response;
  };
}
