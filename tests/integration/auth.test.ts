import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const delivery = vi.hoisted(() => ({
  queue: [] as Array<() => Promise<void>>,
  send: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => delivery.queue.push(task),
}));
vi.mock("resend", () => ({
  Resend: class { emails = { send: delivery.send }; },
}));

// Never fall back to DATABASE_URL or load a private env file.
const databaseURL = process.env.TEST_DATABASE_URL;
const baseURL = "http://localhost:3100";
const password = "Original-test-password-123!";
const newPassword = "Replacement-test-password-456!";

describe.skipIf(!databaseURL)("Better Auth with isolated Postgres", () => {
  let auth: typeof import("@/lib/auth").auth;
  let db: Pool | undefined;
  let authPool: Pool | undefined;

  beforeAll(async () => {
    const url = new URL(databaseURL!);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/pip_auth_test" || url.search || url.hash
    ) {
      throw new Error("TEST_DATABASE_URL must target local pip_auth_test without query parameters");
    }
    const global = globalThis as typeof globalThis & { authPool?: Pool };
    if (global.authPool) throw new Error("Refusing to reuse an existing auth database pool");
    vi.stubEnv("DATABASE_URL", databaseURL!);
    vi.stubEnv("BETTER_AUTH_URL", baseURL);
    vi.stubEnv("BETTER_AUTH_SECRET", "pip-integration-only-secret-at-least-32-characters");
    vi.stubEnv("RESEND_API_KEY", "re_test_never_sent");
    vi.stubEnv("RESEND_FROM_EMAIL", "PIP Test <auth@example.test>");
    vi.stubEnv("NODE_ENV", "test");
    db = new Pool({ connectionString: databaseURL, max: 2 });
    const result = await db.query("SELECT current_database() AS name");
    expect(result.rows[0].name).toBe("pip_auth_test");
    ({ auth } = await import("@/lib/auth"));
    authPool = global.authPool;
  });

  async function clean() {
    // No CASCADE: cleanup must not reach tables outside this explicit list.
    await db!.query('TRUNCATE TABLE public."session", public."account", public."verification", public."user"');
  }

  beforeEach(async () => {
    await clean();
    delivery.queue.length = 0;
    delivery.send.mockReset().mockResolvedValue({ data: { id: "test-email" }, error: null });
  });

  afterAll(async () => {
    try {
      if (authPool) await clean();
    } finally {
      await Promise.all([db?.end(), authPool?.end()]);
      const global = globalThis as typeof globalThis & { authPool?: Pool };
      if (authPool && global.authPool === authPool) delete global.authPool;
      vi.unstubAllEnvs();
    }
  });

  function request(path: string, body?: Record<string, unknown>, cookie?: string) {
    return auth.handler(new Request(new URL(path, `${baseURL}/api/auth/`), {
      method: body ? "POST" : "GET",
      headers: {
        origin: baseURL,
        ...(body ? { "content-type": "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
  }

  async function flush() {
    while (delivery.queue.length) await delivery.queue.shift()!();
  }

  function emailLink(subject: string): URL {
    const messages = delivery.send.mock.calls.map(([message]) => message);
    const message = messages.filter((message) => message.subject === subject).at(-1);
    expect(message).toBeDefined();
    const link = message.text.match(/https?:\/\/\S+/)?.[0];
    expect(link).toBeTruthy();
    const url = new URL(link);
    expect(url.origin).toBe(baseURL);
    return url;
  }

  function sessionCookie(response: Response) {
    const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
    expect(cookies.some((cookie) => cookie.startsWith("better-auth.session_token="))).toBe(true);
    return cookies.join("; ");
  }

  async function signup() {
    const email = `auth-${randomUUID()}@example.test`;
    const response = await request("sign-up/email", { email, password, name: "Test User" });
    expect(response.status).toBe(200);
    return email;
  }

  async function verifiedUser() {
    const email = await signup();
    await flush();
    const link = emailLink("Verify your PIP email address");
    expect((await request(link.href)).status).toBeLessThan(400);
    return email;
  }

  async function signIn(email: string, value = password) {
    const response = await request("sign-in/email", { email, password: value });
    expect(response.status).toBe(200);
    return sessionCookie(response);
  }

  async function resetToken(email: string) {
    const response = await request("request-password-reset", {
      email, redirectTo: `${baseURL}/auth/reset-password`,
    });
    expect(response.status).toBe(200);
    await flush();
    const link = emailLink("Reset your PIP password");
    const callback = await request(link.href);
    expect(callback.status).toBe(302);
    const token = new URL(callback.headers.get("location")!).searchParams.get("token");
    expect(token).toBeTruthy();
    return token!;
  }

  it("requires email verification, then creates and revokes a cookie session", async () => {
    const email = await signup();
    expect(delivery.send).not.toHaveBeenCalled();
    expect(delivery.queue.length).toBeGreaterThan(0);
    const denied = await request("sign-in/email", { email, password });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await flush();
    expect(delivery.send).toHaveBeenCalledWith(expect.objectContaining({
      to: email, from: "PIP Test <auth@example.test>",
    }));
    expect((await request(emailLink("Verify your PIP email address").href)).status).toBeLessThan(400);
    const cookie = await signIn(email);
    const session = await request("get-session", undefined, cookie);
    expect(await session.json()).toMatchObject({ user: { email, emailVerified: true } });
    expect((await request("sign-out", {}, cookie)).status).toBe(200);
    expect(await (await request("get-session", undefined, cookie)).json()).toBeNull();
  });

  it("returns identical reset responses for known and unknown accounts", async () => {
    const email = await verifiedUser();
    delivery.send.mockClear();
    const unknown = await request("request-password-reset", { email: "missing@example.test" });
    await flush();
    expect(delivery.send).not.toHaveBeenCalled();
    const known = await request("request-password-reset", { email });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(await known.json());
    expect(delivery.send).not.toHaveBeenCalled();
    await flush();
    expect(delivery.send).toHaveBeenCalledTimes(1);
  });

  it("resets a password once and revokes all existing sessions", async () => {
    const email = await verifiedUser();
    const cookies = [await signIn(email), await signIn(email)];
    const token = await resetToken(email);
    const response = await request("reset-password", { token, newPassword });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: true });
    const reused = await request("reset-password", { token, newPassword: password });
    expect(reused.status).toBe(400);
    expect(await reused.json()).toMatchObject({ code: "INVALID_TOKEN" });
    for (const cookie of cookies) {
      expect(await (await request("get-session", undefined, cookie)).json()).toBeNull();
    }
    expect((await request("sign-in/email", { email, password })).status).toBe(401);
    const cookie = await signIn(email, newPassword);
    expect(await (await request("get-session", undefined, cookie)).json()).toMatchObject({ user: { email } });
  });

  it("rejects invalid and expired reset tokens without changing the password", async () => {
    const email = await verifiedUser();
    const token = await resetToken(email);
    const result = await db!.query(
      'UPDATE public."verification" SET "expiresAt" = CURRENT_TIMESTAMP - INTERVAL \'1 hour\' WHERE identifier = $1',
      [`reset-password:${token}`],
    );
    expect(result.rowCount).toBe(1);
    for (const candidate of ["invalid-reset-token", token]) {
      const response = await request("reset-password", { token: candidate, newPassword });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "INVALID_TOKEN" });
    }
    await signIn(email);
    expect((await request("sign-in/email", { email, password: newPassword })).status).toBe(401);
  });

  it("rejects untrusted reset and verification redirect URLs", async () => {
    const { betterAuth } = await import("better-auth");
    const options: import("better-auth").BetterAuthOptions = auth.options;
    // Better Auth disables origin checks in test mode unless explicitly configured.
    const securedAuth = betterAuth({
      ...options,
      advanced: {
        ...options.advanced,
        disableOriginCheck: false,
        disableCSRFCheck: false,
      },
    });
    function secureRequest(path: string, body?: Record<string, unknown>) {
      return securedAuth.handler(new Request(new URL(path, `${baseURL}/api/auth/`), {
        method: body ? "POST" : "GET",
        headers: {
          origin: baseURL,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }));
    }

    const email = await signup();
    await flush();
    const link = emailLink("Verify your PIP email address");
    delivery.send.mockClear();
    const reset = await secureRequest("request-password-reset", {
      email, redirectTo: "https://untrusted.example/reset",
    });
    expect(reset.status).toBe(403);
    expect(reset.headers.get("location")).toBeNull();
    await flush();
    expect(delivery.send).not.toHaveBeenCalled();

    const allowed = await secureRequest("request-password-reset", {
      email, redirectTo: `${baseURL}/auth/reset-password`,
    });
    expect(allowed.status).toBe(200);
    await flush();
    const resetLink = emailLink("Reset your PIP password");
    const trustedCallback = await secureRequest(resetLink.href);
    expect(trustedCallback.status).toBe(302);
    expect(new URL(trustedCallback.headers.get("location")!).origin).toBe(baseURL);
    resetLink.searchParams.set("callbackURL", "https://untrusted.example/reset");
    const resetCallback = await secureRequest(resetLink.href);
    expect(resetCallback.status).toBe(403);
    expect(await resetCallback.json()).toMatchObject({ code: "INVALID_CALLBACK_URL" });
    expect(resetCallback.headers.get("location")).toBeNull();

    link.searchParams.set("callbackURL", "https://untrusted.example/verified");
    const verification = await secureRequest(link.href);
    expect(verification.status).toBe(403);
    expect(await verification.json()).toMatchObject({ code: "INVALID_CALLBACK_URL" });
    expect(verification.headers.get("location")).toBeNull();
  });

  it("matches the schema required by the runtime auth configuration", async () => {
    const migration = await getMigrations(auth.options);
    expect(migration.toBeCreated).toHaveLength(0);
    expect(migration.toBeAdded).toHaveLength(0);
  });

  it("enables RLS and grants no Data API role access to auth tables", async () => {
    const tables = ["user", "session", "account", "verification"];
    const result = await db!.query(
      `SELECT c.relname, c.relrowsecurity,
        has_table_privilege(r.rolname, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS table_access,
        has_any_column_privilege(r.rolname, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES') AS column_access,
        r.rolname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       CROSS JOIN pg_roles r
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
         AND r.rolname IN ('anon', 'authenticated', 'service_role')`,
      [tables],
    );
    expect(result.rows).toHaveLength(12);
    for (const row of result.rows) {
      expect(row, `${row.rolname} on ${row.relname}`).toMatchObject({
        relrowsecurity: true, table_access: false, column_access: false,
      });
    }
  });
});
