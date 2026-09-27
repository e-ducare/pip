import "server-only";

import { after } from "next/server";
import { Resend } from "resend";
import { requiredEnv } from "./auth-env";

type AuthEmail = {
  to: string;
  subject: string;
  text: string;
};

// Read at startup: Better Auth swallows errors thrown by email callbacks.
const resend = new Resend(requiredEnv("RESEND_API_KEY"));
const from = requiredEnv("RESEND_FROM_EMAIL");

export function sendAuthEmail(email: AuthEmail) {
  // Keep delivery latency out of account lookup responses. Next.js waits for this task.
  after(async () => {
    try {
      const { error } = await resend.emails.send({ from, ...email });
      if (error) {
        console.error("Auth email delivery failed", {
          name: error.name,
          statusCode: error.statusCode,
        });
      }
    } catch {
      // Provider errors can contain email addresses or token-bearing message bodies.
      console.error("Auth email delivery failed: Resend request could not complete");
    }
  });
}
