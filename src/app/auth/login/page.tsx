import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Verification links sign the user in and return here.
  if (await auth.api.getSession({ headers: await headers() })) redirect("/protected");
  const { error } = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm verificationError={error !== undefined} />
      </div>
    </div>
  );
}
