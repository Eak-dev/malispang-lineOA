/** Historical LOCAL fixtures must not inherit a live pull_request event.
 * Test-only, sequential scope: current PR validation never calls this helper.
 * Await the operation before restoring every event field, including on failure. */
export const historicalEnvironmentKeys = [
  "GITHUB_EVENT_NAME",
  "GITHUB_EVENT_PATH",
  "GITHUB_REPOSITORY",
  "GITHUB_SHA",
  "GITHUB_REF",
] as const;
export async function withHistoricalEnvironment<T>(
  run: () => Promise<T> | T,
): Promise<T> {
  const previous = historicalEnvironmentKeys.map(
    (key) => [key, process.env[key]] as const,
  );
  for (const key of historicalEnvironmentKeys) delete process.env[key];
  process.env.GITHUB_EVENT_NAME = "push";
  try {
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
