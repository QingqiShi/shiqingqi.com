import { Component } from "react";

interface BeforeCommitProps {
  /** Changes in each commit where `read` runs. */
  readonly when: unknown;
  readonly read: () => void;
}

/**
 * Calls `read` in each commit where `when` changes, before React changes the
 * DOM, so that `read` sees the screen as the commit before left it. It shows
 * nothing. A hook cannot run at that time, so this is a class component.
 *
 * @internal
 */
export class BeforeCommit extends Component<BeforeCommitProps> {
  override getSnapshotBeforeUpdate(previous: BeforeCommitProps) {
    if (!Object.is(previous.when, this.props.when)) this.props.read();
    return null;
  }

  // React asks for `componentDidUpdate` beside `getSnapshotBeforeUpdate`.
  override componentDidUpdate() {}

  override render() {
    return null;
  }
}
