export interface TestSafetyInput {
  readonly accountName: string;
  readonly environment: "test";
  readonly environmentVariables?: Readonly<Record<string, string | undefined>>;
}

const prohibitedCredentialVariables = [
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CHANNEL_SECRET",
  "PRODUCTION_LINE_CHANNEL_ACCESS_TOKEN",
  "PRODUCTION_LINE_CHANNEL_SECRET",
] as const;

export function assertTestSafetyBoundary(input: TestSafetyInput): void {
  if (input.accountName !== "มะลิปัง TEST" || input.environment !== "test") {
    throw new Error("FAIL_CLOSED_NON_TEST_TARGET");
  }

  const variables = input.environmentVariables ?? {};
  if (prohibitedCredentialVariables.some((name) => variables[name]?.trim())) {
    throw new Error("FAIL_CLOSED_CREDENTIAL_PRESENT");
  }
}
