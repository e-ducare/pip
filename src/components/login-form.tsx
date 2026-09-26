"use client";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function LoginForm({
  className,
  verificationError = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { verificationError?: boolean }) {
  const emailInput = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const router = useRouter();

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.current?.reportValidity()) return;
    setIsResending(true);
    setVerificationStatus(null);
    setResendError(null);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/auth/login",
      });
      if (error) {
        throw new Error(error.message || "Unable to send verification email");
      }
      setVerificationStatus(
        "If this email needs verification, a link has been sent. Check your inbox.",
      );
    } catch {
      setResendError("Unable to send a verification link. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) throw new Error(error.message || "Unable to log in");
      router.push("/protected");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verificationError && (
            <p role="alert" className="mb-4 text-sm text-red-500">
              This verification link is invalid or expired. Enter your email to
              request a new link below.
            </p>
          )}
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  ref={emailInput}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-500">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isResending}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
          <form onSubmit={handleResend} className="mt-4 flex flex-col gap-2">

            {verificationStatus && (
              <p role="status" className="text-sm text-muted-foreground">
                {verificationStatus}
              </p>
            )}
            {resendError && (
              <p role="alert" className="text-sm text-red-500">{resendError}</p>
            )}
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={isLoading || isResending || !email.trim()}
            >
              {isResending ? "Sending verification link..." : "Resend verification email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
