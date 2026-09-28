import "server-only";

import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { Client } from "pg";
import { sendAuthEmail } from "./auth-email";
import { requiredEnv } from "./auth-env";

// Workers cannot reuse a socket across requests, so each checkout opens a
// client and closes it on release. Hyperdrive pools the database connections.
const database = {
  async connect() {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
      connectionTimeoutMillis: 10_000,
    });
    await client.connect();
    return Object.assign(client, {
      release: () => void client.end().catch(() => {}),
    });
  },
  async end() {},
};

export const auth = betterAuth({
  appName: "PIP",
  baseURL: requiredEnv("BETTER_AUTH_URL"),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  database,
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
