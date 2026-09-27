import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Check your email
              </CardTitle>
              <CardDescription>Email verification is required to log in</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If your email is eligible for registration, you&apos;ll receive a
                verification link. Check your inbox and spam folder. If you already
                have an account, log in or reset your password.
              </p>
              <Link href="/auth/login" className="mt-4 inline-block text-sm underline underline-offset-4">
                Back to login
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
