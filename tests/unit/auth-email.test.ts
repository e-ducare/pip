import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queue: [] as Array<() => Promise<void>>,
  send: vi.fn(),
  constructor: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: vi.fn((task: () => Promise<void>) => mocks.queue.push(task)),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
    constructor(key: string) { mocks.constructor(key); }
  },
}));

import { sendAuthEmail } from "@/lib/auth-email";

const email = {
  to: "recipient@example.test",
  subject: "Verify your email",
  text: "https://app.example.test/verify?token=private-token",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queue.length = 0;
  mocks.send.mockResolvedValue({ data: { id: "test-email" }, error: null });
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("RESEND_FROM_EMAIL", "PIP Test <auth@example.test>");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("sendAuthEmail", () => {
  it("defers delivery until after runs and uses the configured sender and API key", async () => {
    sendAuthEmail(email);
    expect(mocks.constructor).toHaveBeenCalledWith("re_test_key");
    expect(mocks.queue).toHaveLength(1);
    expect(mocks.send).not.toHaveBeenCalled();
    await mocks.queue[0]();
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith({
      from: "PIP Test <auth@example.test>", ...email,
    });
  });

  it("logs only name and statusCode for a returned provider error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => { });
    mocks.send.mockResolvedValue({
      error: {
        name: "validation_error", statusCode: 422,
        message: `${email.to} ${email.text}`, body: email,
      }
    });
    sendAuthEmail(email);
    expect(log).not.toHaveBeenCalled();
    await expect(mocks.queue[0]()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledExactlyOnceWith("Auth email delivery failed", {
      name: "validation_error", statusCode: 422,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-token");
    expect(JSON.stringify(log.mock.calls)).not.toContain(email.to);
  });

  it("catches rejected delivery without logging the error contents", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => { });
    mocks.send.mockRejectedValue(new Error(`${email.to} ${email.text}`));
    sendAuthEmail(email);
    await expect(mocks.queue[0]()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "Auth email delivery failed: Resend request could not complete",
    );
  });

  it.each(["RESEND_API_KEY", "RESEND_FROM_EMAIL"])("requires %s before scheduling", (name) => {
    vi.stubEnv(name, undefined);
    expect(() => sendAuthEmail(email)).toThrow(`Missing required environment variable: ${name}`);
    expect(mocks.queue).toHaveLength(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
