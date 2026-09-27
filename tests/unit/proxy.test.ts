import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

type GetSession = (context: { headers: Headers; returnHeaders: true }) => Promise<{
  headers: Headers;
  response: object | null;
}>;
const getSession = vi.hoisted(() => vi.fn<GetSession>());
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));

import { config, proxy } from "@/proxy";

const refreshedCookie = "better-auth.session_token=renewed; Path=/; Max-Age=604800; HttpOnly";

beforeEach(() => getSession.mockReset());

describe("session proxy", () => {
  it("redirects requests without a valid session to login", async () => {
    getSession.mockResolvedValue({ headers: new Headers(), response: null });
    const response = await proxy(
      new NextRequest("https://app.example.test/protected/settings", {
        headers: { cookie: "better-auth.session_token=not-a-valid-session" },
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.test/auth/login");
  });

  it("passes valid sessions through and forwards the renewed cookie", async () => {
    getSession.mockResolvedValue({
      headers: new Headers([["set-cookie", refreshedCookie]]),
      response: { session: {}, user: {} },
    });
    const request = new NextRequest("https://app.example.test/protected");
    const response = await proxy(request);
    expect(getSession).toHaveBeenCalledExactlyOnceWith({
      headers: request.headers,
      returnHeaders: true,
    });
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.getSetCookie()).toEqual([refreshedCookie]);
  });

  it.each([
    ["/", true],
    ["/protected", true],
    ["/projects/42", true],
    ["/api/export", true],
    ["/authors", true],
    ["/auth/login", false],
    ["/auth/reset-password", false],
    ["/api/auth/get-session", false],
    ["/_next/static/chunk.js", false],
    ["/favicon.ico", false],
  ])("matches %s: %s", (url, matched) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(matched);
  });
});
