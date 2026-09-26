import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const hasToken = typeof token === "string" && token.trim().length > 0;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {error === undefined && hasToken ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Request a new reset link</CardTitle>
              <CardDescription>
                This password reset link is missing, invalid, or expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/forgot-password" className="text-sm underline underline-offset-4">
                Request a new password reset link
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
