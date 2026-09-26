import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

describe("protected route proxy", () => {
  it("redirects requests without a session cookie to login", () => {
    const response = proxy(new NextRequest("https://app.example.test/protected/settings"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.test/auth/login");
  });

  it("only checks cookie presence, leaving validation to the server", () => {
    const response = proxy(new NextRequest("https://app.example.test/protected", {
      headers: { cookie: "better-auth.session_token=not-a-valid-session" },
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("matches only the protected route tree", () => {
    expect(config.matcher).toEqual(["/protected/:path*"]);
  });
});
