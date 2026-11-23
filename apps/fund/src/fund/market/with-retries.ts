const RETRIES = 2;
const PAUSE_MS = 1500;

/** Runs `task`, and again up to twice after a pause when it fails. */
export async function withRetries<T>(task: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, PAUSE_MS * (attempt + 1)),
      );
    }
  }
}
