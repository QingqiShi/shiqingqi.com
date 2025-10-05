// Type augmentation for dialog closedby attribute
// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby
// Type augmentation for Invoker Commands API
// https://open-ui.org/components/invokers.explainer/

import {} from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface DialogHTMLAttributes<T> {
    closedby?: "any" | "closerequest" | "none";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ButtonHTMLAttributes<T> {
    commandfor?: string;
    command?: string;
  }
}
