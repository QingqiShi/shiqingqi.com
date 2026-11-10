import { Fragment } from "react";

/**
 * A mail address that a narrow line breaks after an "@" or a ".", so that a
 * long one keeps whole words, not a word cut at the edge.
 */
export function AddressText({ address }: { address: string }) {
  return address.split(/(?<=[@.])/).map((part, index) => (
    <Fragment key={index}>
      {index > 0 ? <wbr /> : null}
      {part}
    </Fragment>
  ));
}
