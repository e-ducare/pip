import "server-only";

import { betterAuth } from "better-auth";
import type { GenericEndpointContext } from "@better-auth/core";
import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { setSessionCookie } from "better-auth/cookies";
import { sendAuthEmail } from "./auth-email";
import { requiredEnv } from "./auth-env";
import { pool } from "./db";

const baseURL = requiredEnv("BETTER_AUTH_URL");

export const auth = betterAuth({
  appName: "PIP",
  // Worker Previews serve from <preview>-pip.e-ducare-org.workers.dev, so auth takes its
  // origin and email link host from the request when the host is allowed.
  baseURL: {
    allowedHosts: [new URL(baseURL).host, "*-pip.e-ducare-org.workers.dev"],
    fallback: baseURL,
  },
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  database: pool,
  advanced: {
    // Cloudflare sets this header from the client connection; clients can forge x-forwarded-for.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    // The check runs at startup, where Workers forbid I/O. Integration tests check the schema.
    database: { validateSchema: false },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    // Signs the user in. Better Auth has no option for this yet:
    // https://github.com/better-auth/better-auth/pull/6246
    // Better Auth runs this after revoking sessions, so the new session survives.
    async onPasswordReset({ user }) {
      // Always set here: Better Auth calls this only from inside its endpoints.
      const ctx = getCurrentAuthEndpointContext() as GenericEndpointContext;
      // The reset link reached the user's inbox, which proves they own the address.
      const verifiedUser = await ctx.context.internalAdapter.updateUser(user.id, {
        emailVerified: true,
      });
      const session = await ctx.context.internalAdapter.createSession(user.id);
      await setSessionCookie(ctx, { session, user: verifiedUser });
    },
    async sendResetPassword({ user, url }) {
      sendAuthEmail({
        to: user.email,
        subject: "Reset your PIP password",
        text: `Reset your password using this link:\n\n${url}\n\nIf you did not request this, ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      sendAuthEmail({
        to: user.email,
        subject: "Verify your PIP email address",
        text: `Verify your email address using this link:\n\n${url}\n\nIf you did not request this, ignore this email.`,
      });
    },
  },
});
