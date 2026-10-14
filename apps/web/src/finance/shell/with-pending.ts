// React Compiler cannot compile `finally` in a component or hook. For this reason, these functions are in a plain module.

/**
 * Sets the pending state, runs `action`, and resets the state when `action`
 * settles, also when it throws. Resolves or rejects as `action` does.
 */
export async function withPending<T>(
  setPending: (pending: boolean) => void,
  action: () => Promise<T>,
): Promise<T> {
  setPending(true);
  try {
    return await action();
  } finally {
    setPending(false);
  }
}

/** Like `withPending`, but the state is `key` while `action` runs and null after. */
export function withPendingKey<K, T>(
  setPending: (key: K | null) => void,
  key: K,
  action: () => Promise<T>,
): Promise<T> {
  return withPending((pending) => {
    setPending(pending ? key : null);
  }, action);
}
