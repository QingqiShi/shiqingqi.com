// The trip planner has no 404 screen of its own yet. Next shows its own 404
// inside a layout only when the layout's segment has a not-found file, so
// this file uses that same 404 to keep it inside the locale layout.
export { default } from "next/dist/client/components/builtin/not-found";
