import "server-only";

import { betterAuth } from "better-auth";
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
