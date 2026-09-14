import "server-only";

import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { sendAuthEmail } from "./auth-email";
import { requiredEnv } from "./auth-env";

const globalForAuth = globalThis as typeof globalThis & { authPool?: Pool };
const pool = globalForAuth.authPool ?? new Pool({
  connectionString: requiredEnv("DATABASE_URL"),
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

if (process.env.NODE_ENV !== "production") globalForAuth.authPool = pool;

export const auth = betterAuth({
  appName: "PIP",
  baseURL: requiredEnv("BETTER_AUTH_URL"),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  database: pool,
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
    sendOnSignIn: true,
    async sendVerificationEmail({ user, url }) {
      sendAuthEmail({
        to: user.email,
        subject: "Verify your PIP email address",
        text: `Verify your email address using this link:\n\n${url}\n\nIf you did not request this, ignore this email.`,
      });
    },
  },
});
