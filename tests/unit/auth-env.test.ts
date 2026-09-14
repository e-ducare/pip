import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { requiredEnv } from "@/lib/auth-env";

afterEach(() => vi.unstubAllEnvs());

describe("requiredEnv", () => {
  it.each([undefined, "", "  \t\n"])("rejects missing or blank values: %s", (value) => {
    vi.stubEnv("PIP_TEST_REQUIRED", value);
    expect(() => requiredEnv("PIP_TEST_REQUIRED")).toThrow(
      "Missing required environment variable: PIP_TEST_REQUIRED",
    );
  });

  it("returns the original nonblank value", () => {
    vi.stubEnv("PIP_TEST_REQUIRED", " configured-value ");
    expect(requiredEnv("PIP_TEST_REQUIRED")).toBe(" configured-value ");
  });
});
