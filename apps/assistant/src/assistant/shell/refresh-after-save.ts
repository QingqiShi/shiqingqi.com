let settlingSaves = 0;

// React runs the unmount effects of one commit in one pass, and a `then`
// callback runs after that pass. Thus each row that goes in the commit adds to
// the count before the count can go back to zero, and only the last save to
// settle clears the cached pages.
/** Refreshes once `save` has settled, and once for all saves that settle together. */
export function refreshAfterSave(save: Promise<unknown>, refresh: () => void) {
  settlingSaves += 1;
  void save.then(() => {
    settlingSaves -= 1;
    if (settlingSaves === 0) refresh();
  });
}
