// Type augmentations for experimental HTML features
// These augmentations can be removed when @types/react includes them natively
// Track React types updates: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react
// Last checked: January 2025

import {} from "react";

declare module "react" {
  // Type augmentation for dialog closedby attribute
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby
  // Remove when: @types/react includes DialogHTMLAttributes.closedby
  // Browser support: Chrome 134+, Safari/Firefox pending
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface DialogHTMLAttributes<T> {
    closedby?: "any" | "closerequest" | "none";
  }

  // Type augmentation for Invoker Commands API
  // https://open-ui.org/components/invokers.explainer/
  // Remove when: @types/react includes ButtonHTMLAttributes.commandfor/command
  // Browser support: Chrome 131+, Safari/Firefox pending
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ButtonHTMLAttributes<T> {
    commandfor?: string;
    command?: string;
  }
}
